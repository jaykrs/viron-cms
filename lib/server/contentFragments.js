const slugify = require('slugify');
const db = require('./db');
const { ApiError } = require('./errors');

// ---------------------------------------------------------------------------
// Field types a model can use, and how each maps to storage + GraphQL:
//   text/longtext/richtext/date/datetime/enum/image -> string
//   number -> float, integer -> int32, boolean, json -> any JSON value
//   reference -> id of another fragment (exposed in GraphQL as the
//                referenced model's type, resolved on demand)
// ---------------------------------------------------------------------------
const FIELD_TYPES = [
  'text', 'longtext', 'richtext', 'number', 'integer', 'boolean',
  'date', 'datetime', 'enum', 'image', 'reference', 'json',
];
const MULTI_OK = new Set(['text', 'longtext', 'number', 'integer', 'date', 'datetime', 'enum', 'image', 'reference']);
const STATUSES = ['draft', 'published'];
const MAX_MULTI_ITEMS = 100;
const MAX_STRING = 100000;
const INT32_MAX = 2147483647;

const API_NAME_RE = /^[A-Z][A-Za-z0-9]{0,63}$/;
const FIELD_NAME_RE = /^[a-z][A-Za-z0-9]{0,63}$/;
const FRAGMENT_NAME_RE = /^[a-z0-9][a-z0-9_-]{0,99}$/;

// Names already used by the fixed part of the GraphQL schema.
const RESERVED_NAMES = new Set([
  'Query', 'Mutation', 'Subscription', 'JSON', 'ContentModel', 'String', 'Int', 'Float', 'Boolean', 'ID',
  'contentModels', 'contentModel', 'createContentModel', 'updateContentModel', 'deleteContentModel',
]);

function lowerFirst(s) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

// Every top-level GraphQL name a model generates — used to make sure two
// models can never collide (e.g. "Article" and "ArticleList").
function generatedNames(apiName) {
  const l = lowerFirst(apiName);
  return [
    apiName, `${apiName}List`, `${apiName}Input`,
    `${l}List`, `${l}ById`, `${l}ByPath`,
    `create${apiName}`, `update${apiName}`, `delete${apiName}`,
  ];
}

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

function serializeModel(row, counts) {
  return {
    id: row.id,
    name: row.name,
    apiName: row.api_name,
    description: row.description || '',
    fields: JSON.parse(row.fields_json || '[]'),
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(counts ? { fragmentCount: counts.get(row.id) || 0 } : {}),
  };
}

async function listModels({ withCounts = false } = {}) {
  const rows = await db.all('SELECT * FROM cf_models ORDER BY name COLLATE NOCASE ASC');
  let counts = null;
  if (withCounts) {
    const c = await db.all('SELECT model_id, COUNT(*) AS c FROM cf_fragments GROUP BY model_id');
    counts = new Map(c.map((r) => [r.model_id, r.c]));
  }
  return rows.map((r) => serializeModel(r, counts));
}

async function getModelById(id) {
  const row = await db.get('SELECT * FROM cf_models WHERE id = ?', [id]);
  if (!row) throw new ApiError(404, 'Content model not found');
  return serializeModel(row);
}

async function getModelByApiName(apiName) {
  const row = await db.get('SELECT * FROM cf_models WHERE api_name = ?', [apiName]);
  return row ? serializeModel(row) : null;
}

// Cheap fingerprint of "what models exist and at which version" — the
// GraphQL layer rebuilds its schema whenever this changes. Any create,
// update, or delete changes at least one of the three numbers.
async function schemaVersionKey() {
  const r = await db.get(
    'SELECT COUNT(*) AS c, COALESCE(SUM(version), 0) AS v, COALESCE(MAX(id), 0) AS m FROM cf_models'
  );
  return `${r.c}:${r.v}:${r.m}`;
}

function cleanString(v, max = 200) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function normalizeFields(rawFields, { selfApiName, knownApiNames }) {
  if (!Array.isArray(rawFields) || rawFields.length === 0) {
    throw new ApiError(400, 'A model needs at least one field');
  }
  if (rawFields.length > 60) throw new ApiError(400, 'A model can have at most 60 fields');

  const seen = new Set();
  return rawFields.map((f, i) => {
    const where = `Field #${i + 1}`;
    const name = cleanString(f?.name, 64);
    if (!FIELD_NAME_RE.test(name)) {
      throw new ApiError(400, `${where}: key "${name}" must start with a lowercase letter and contain only letters and digits (e.g. "publishDate")`);
    }
    if (seen.has(name)) throw new ApiError(400, `${where}: duplicate field key "${name}"`);
    seen.add(name);

    const type = f.type;
    if (!FIELD_TYPES.includes(type)) throw new ApiError(400, `${where} (${name}): unknown type "${type}"`);

    const out = {
      name,
      label: cleanString(f.label, 100) || name,
      type,
      required: !!f.required,
      multiple: false,
      helpText: cleanString(f.helpText, 300),
    };

    if (f.multiple) {
      if (!MULTI_OK.has(type)) throw new ApiError(400, `${where} (${name}): type "${type}" cannot hold multiple values`);
      out.multiple = true;
    }

    if (type === 'enum') {
      const options = Array.isArray(f.options)
        ? [...new Set(f.options.map((o) => cleanString(String(o), 100)).filter(Boolean))]
        : [];
      if (options.length === 0) throw new ApiError(400, `${where} (${name}): an enumeration needs at least one option`);
      out.options = options;
    }

    if (type === 'reference') {
      const refModel = cleanString(f.refModel, 64);
      const known = new Set([...(knownApiNames || []), selfApiName].filter(Boolean));
      if (!refModel || !known.has(refModel)) {
        throw new ApiError(400, `${where} (${name}): reference must point at an existing model (got "${refModel}")`);
      }
      out.refModel = refModel;
    }
    return out;
  });
}

function assertNoNameCollisions(apiName, otherApiNames) {
  const taken = new Set(RESERVED_NAMES);
  for (const other of otherApiNames) generatedNames(other).forEach((n) => taken.add(n));
  const clash = generatedNames(apiName).find((n) => taken.has(n));
  if (clash) {
    throw new ApiError(409, `API name "${apiName}" would generate "${clash}", which is already used by the GraphQL schema or another model`);
  }
}

async function createModel(body, { extraKnownApiNames = [] } = {}) {
  const name = cleanString(body?.name, 100);
  const apiName = cleanString(body?.apiName, 64);
  if (!name) throw new ApiError(400, 'Model name is required');
  if (!API_NAME_RE.test(apiName)) {
    throw new ApiError(400, 'API name must be PascalCase: start with a capital letter, letters and digits only (e.g. "BlogPost")');
  }

  const existing = await listModels();
  if (existing.some((m) => m.apiName === apiName)) throw new ApiError(409, `A model with API name "${apiName}" already exists`);
  assertNoNameCollisions(apiName, existing.map((m) => m.apiName));

  const fields = normalizeFields(body.fields, {
    selfApiName: apiName,
    knownApiNames: [...existing.map((m) => m.apiName), ...extraKnownApiNames],
  });

  const info = await db.run(
    'INSERT INTO cf_models (name, api_name, description, fields_json) VALUES (?, ?, ?, ?)',
    [name, apiName, cleanString(body.description, 500), JSON.stringify(fields)]
  );
  return getModelById(info.lastInsertRowid);
}

// apiName is immutable on purpose: it is the public GraphQL contract.
async function updateModel(id, body, { extraKnownApiNames = [] } = {}) {
  const model = await getModelById(id);
  const name = body.name !== undefined ? cleanString(body.name, 100) : model.name;
  if (!name) throw new ApiError(400, 'Model name is required');

  let fields = model.fields;
  if (body.fields !== undefined) {
    const others = (await listModels()).map((m) => m.apiName);
    fields = normalizeFields(body.fields, {
      selfApiName: model.apiName,
      knownApiNames: [...others, ...extraKnownApiNames],
    });
  }

  await db.run(
    "UPDATE cf_models SET name = ?, description = ?, fields_json = ?, version = version + 1, updated_at = datetime('now') WHERE id = ?",
    [
      name,
      body.description !== undefined ? cleanString(body.description, 500) : model.description,
      JSON.stringify(fields),
      id,
    ]
  );
  return getModelById(id);
}

async function deleteModel(id, { force = false } = {}) {
  const model = await getModelById(id);

  const referencedBy = (await listModels()).filter(
    (m) => m.id !== model.id && m.fields.some((f) => f.type === 'reference' && f.refModel === model.apiName)
  );
  if (referencedBy.length) {
    throw new ApiError(409, `Model is referenced by: ${referencedBy.map((m) => m.apiName).join(', ')}. Remove those reference fields first.`);
  }

  const { c } = await db.get('SELECT COUNT(*) AS c FROM cf_fragments WHERE model_id = ?', [id]);
  if (c > 0 && !force) {
    throw new ApiError(409, `Model still has ${c} fragment(s). Delete them first, or delete with force.`);
  }
  await db.run('DELETE FROM cf_fragments WHERE model_id = ?', [id]);
  await db.run('DELETE FROM cf_models WHERE id = ?', [id]);
}

// ---------------------------------------------------------------------------
// Validation of fragment data against a model
// ---------------------------------------------------------------------------

function isEmpty(f, v) {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string' && v.trim() === '') return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}

async function validateValue(f, v, modelsByApiName) {
  switch (f.type) {
    case 'text':
    case 'longtext':
    case 'richtext': {
      if (typeof v !== 'string') throw new Error('must be text');
      if (v.length > MAX_STRING) throw new Error('is too long');
      return f.type === 'text' ? v.trim() : v;
    }
    case 'number': {
      const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
      if (typeof n !== 'number' || !Number.isFinite(n)) throw new Error('must be a number');
      return n;
    }
    case 'integer': {
      const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
      if (!Number.isInteger(n)) throw new Error('must be a whole number');
      if (Math.abs(n) > INT32_MAX) throw new Error('is out of range');
      return n;
    }
    case 'boolean': {
      if (typeof v !== 'boolean') throw new Error('must be true or false');
      return v;
    }
    case 'date': {
      if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) {
        throw new Error('must be a date like 2026-03-31');
      }
      return v;
    }
    case 'datetime': {
      if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v) || Number.isNaN(Date.parse(v))) {
        throw new Error('must be a date-time like 2026-03-31T14:30');
      }
      return v;
    }
    case 'enum': {
      if (!f.options.includes(v)) throw new Error(`must be one of: ${f.options.join(', ')}`);
      return v;
    }
    case 'image': {
      if (typeof v !== 'string' || v.length > 2000 || !(v.startsWith('/') || /^https?:\/\//i.test(v)) || v.startsWith('//')) {
        throw new Error('must be an asset path (/uploads/...) or an http(s) URL');
      }
      return v;
    }
    case 'reference': {
      const id = typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v;
      if (!Number.isInteger(id)) throw new Error('must be a fragment id');
      const row = await db.get('SELECT id, model_id FROM cf_fragments WHERE id = ?', [id]);
      if (!row) throw new Error(`fragment ${id} does not exist`);
      const target = modelsByApiName.get(f.refModel);
      if (target && row.model_id !== target.id) throw new Error(`fragment ${id} is not a ${f.refModel}`);
      return id;
    }
    case 'json': {
      try {
        if (JSON.stringify(v).length > MAX_STRING) throw new Error('too large');
      } catch {
        throw new Error('must be valid JSON of reasonable size');
      }
      return v;
    }
    default:
      throw new Error('unsupported field type');
  }
}

function assertKnownKeys(model, data) {
  const known = new Set(model.fields.map((f) => f.name));
  const unknown = Object.keys(data || {}).filter((k) => !known.has(k));
  if (unknown.length) throw new ApiError(400, `Unknown field(s) for ${model.apiName}: ${unknown.join(', ')}`);
}

// Returns the cleaned data object (only known fields, empty values dropped)
// or throws one ApiError listing every problem found.
async function validateData(model, input) {
  const modelsByApiName = new Map((await listModels()).map((m) => [m.apiName, m]));
  const errors = [];
  const out = {};

  for (const f of model.fields) {
    const v = input[f.name];
    if (isEmpty(f, v)) {
      if (f.required) errors.push(`${f.label} is required`);
      continue;
    }
    try {
      if (f.multiple) {
        if (!Array.isArray(v)) throw new Error('must be a list');
        if (v.length > MAX_MULTI_ITEMS) throw new Error(`can hold at most ${MAX_MULTI_ITEMS} items`);
        const items = [];
        for (const item of v) {
          if (isEmpty(f, item)) continue;
          items.push(await validateValue(f, item, modelsByApiName));
        }
        if (items.length === 0) {
          if (f.required) errors.push(`${f.label} is required`);
          continue;
        }
        out[f.name] = items;
      } else {
        out[f.name] = await validateValue(f, v, modelsByApiName);
      }
    } catch (e) {
      errors.push(`${f.label} ${e.message}`);
    }
  }
  if (errors.length) throw new ApiError(400, errors.join('; '));
  return out;
}

// ---------------------------------------------------------------------------
// Fragments
// ---------------------------------------------------------------------------

function serializeFragment(row, apiName, modelName) {
  return {
    id: row.id,
    modelId: row.model_id,
    modelApiName: apiName,
    modelName,
    name: row.name,
    title: row.title,
    status: row.status,
    path: `/${apiName}/${row.name}`,
    data: JSON.parse(row.data_json || '{}'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findFragmentById(id) {
  const n = Number(id);
  if (!Number.isInteger(n)) return null;
  const row = await db.get(
    'SELECT f.*, m.api_name AS m_api, m.name AS m_name FROM cf_fragments f JOIN cf_models m ON m.id = f.model_id WHERE f.id = ?',
    [n]
  );
  return row ? serializeFragment(row, row.m_api, row.m_name) : null;
}

async function getFragmentById(id) {
  const f = await findFragmentById(id);
  if (!f) throw new ApiError(404, 'Content fragment not found');
  return f;
}

async function findFragmentByPath(path) {
  const m = /^\/([A-Za-z0-9]+)\/([a-z0-9_-]+)$/.exec(path || '');
  if (!m) return null;
  const row = await db.get(
    'SELECT f.*, m.api_name AS m_api, m.name AS m_name FROM cf_fragments f JOIN cf_models m ON m.id = f.model_id WHERE m.api_name = ? AND f.name = ?',
    [m[1], m[2]]
  );
  return row ? serializeFragment(row, row.m_api, row.m_name) : null;
}

function scalarArg(v) {
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' || typeof v === 'string') return v;
  throw new ApiError(400, 'Filter values must be strings, numbers, booleans or null');
}

// Used by the GraphQL list queries. `filter` is {field: value} or
// {field: {eq, ne, contains, startsWith, gt, gte, lt, lte, in}}.
// Field names are checked against the model before being put in SQL.
async function queryFragments({ model, filter, sortBy, sortDir, limit, offset, publishedOnly }) {
  const fieldSet = new Set(model.fields.map((f) => f.name));
  const metaCols = { _title: 'f.title', _name: 'f.name', _status: 'f.status', _createdAt: 'f.created_at', _updatedAt: 'f.updated_at' };
  const colFor = (key) => {
    if (metaCols[key]) return metaCols[key];
    if (fieldSet.has(key)) return `json_extract(f.data_json, '$.${key}')`;
    throw new ApiError(400, `Unknown field "${key}" for ${model.apiName}`);
  };

  const where = ['f.model_id = ?'];
  const args = [model.id];
  if (publishedOnly) where.push("f.status = 'published'");

  if (filter !== undefined && filter !== null) {
    if (typeof filter !== 'object' || Array.isArray(filter)) throw new ApiError(400, 'filter must be an object');
    for (const [key, raw] of Object.entries(filter)) {
      const col = colFor(key);
      const cond = raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? raw : { eq: raw };
      for (const [op, val] of Object.entries(cond)) {
        switch (op) {
          case 'eq':
            if (val === null) where.push(`${col} IS NULL`);
            else { where.push(`${col} = ?`); args.push(scalarArg(val)); }
            break;
          case 'ne':
            if (val === null) where.push(`${col} IS NOT NULL`);
            else { where.push(`(${col} IS NULL OR ${col} != ?)`); args.push(scalarArg(val)); }
            break;
          case 'contains':
          case 'startsWith': {
            const esc = String(val).replace(/[\\%_]/g, (c) => `\\${c}`);
            where.push(`${col} LIKE ? ESCAPE '\\'`);
            args.push(op === 'contains' ? `%${esc}%` : `${esc}%`);
            break;
          }
          case 'gt': case 'gte': case 'lt': case 'lte': {
            const sym = { gt: '>', gte: '>=', lt: '<', lte: '<=' }[op];
            where.push(`${col} ${sym} ?`);
            args.push(scalarArg(val));
            break;
          }
          case 'in': {
            if (!Array.isArray(val) || val.length === 0 || val.length > 100) throw new ApiError(400, '"in" needs a list of 1-100 values');
            where.push(`${col} IN (${val.map(() => '?').join(', ')})`);
            val.forEach((x) => args.push(scalarArg(x)));
            break;
          }
          default:
            throw new ApiError(400, `Unknown filter operator "${op}"`);
        }
      }
    }
  }

  const dir = String(sortDir || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const orderExpr = colFor(sortBy || '_updatedAt');
  const lim = Math.min(Math.max(parseInt(limit ?? 50, 10) || 50, 1), 100);
  const off = Math.max(parseInt(offset ?? 0, 10) || 0, 0);
  const whereSql = where.join(' AND ');

  const totalRow = await db.get(`SELECT COUNT(*) AS c FROM cf_fragments f WHERE ${whereSql}`, args);
  const rows = await db.all(
    `SELECT f.* FROM cf_fragments f WHERE ${whereSql} ORDER BY ${orderExpr} ${dir}, f.id ${dir} LIMIT ? OFFSET ?`,
    [...args, lim, off]
  );
  return { total: totalRow.c, items: rows.map((r) => serializeFragment(r, model.apiName, model.name)) };
}

// Admin listing across all models (no data payload needed for a table).
async function listFragmentsAdmin({ modelId, modelApiName, search, limit = 200, offset = 0 } = {}) {
  const where = [];
  const args = [];
  if (modelId) { where.push('f.model_id = ?'); args.push(Number(modelId)); }
  if (modelApiName) { where.push('m.api_name = ?'); args.push(String(modelApiName)); }
  if (search) {
    const esc = String(search).replace(/[\\%_]/g, (c) => `\\${c}`);
    where.push("(f.title LIKE ? ESCAPE '\\' OR f.name LIKE ? ESCAPE '\\')");
    args.push(`%${esc}%`, `%${esc}%`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = await db.all(
    `SELECT f.*, m.api_name AS m_api, m.name AS m_name FROM cf_fragments f JOIN cf_models m ON m.id = f.model_id
     ${whereSql} ORDER BY f.updated_at DESC, f.id DESC LIMIT ? OFFSET ?`,
    [...args, Math.min(Number(limit) || 200, 500), Math.max(Number(offset) || 0, 0)]
  );
  return rows.map((r) => {
    const f = serializeFragment(r, r.m_api, r.m_name);
    delete f.data;
    return f;
  });
}

async function uniqueName(modelId, base) {
  let candidate = base;
  for (let i = 2; i < 500; i += 1) {
    const hit = await db.get('SELECT id FROM cf_fragments WHERE model_id = ? AND name = ?', [modelId, candidate]);
    if (!hit) return candidate;
    candidate = `${base}-${i}`;
  }
  throw new ApiError(409, 'Could not generate a unique name; please provide one');
}

async function createFragment(modelId, body) {
  const model = await getModelById(modelId);
  const title = cleanString(body?.title, 200);
  if (!title) throw new ApiError(400, 'Title is required');

  const status = body.status === undefined ? 'draft' : body.status;
  if (!STATUSES.includes(status)) throw new ApiError(400, `Status must be one of: ${STATUSES.join(', ')}`);

  let name;
  if (body.name) {
    name = cleanString(body.name, 100);
    if (!FRAGMENT_NAME_RE.test(name)) throw new ApiError(400, 'Name may only contain lowercase letters, digits, "-" and "_"');
    const hit = await db.get('SELECT id FROM cf_fragments WHERE model_id = ? AND name = ?', [model.id, name]);
    if (hit) throw new ApiError(409, `A ${model.apiName} named "${name}" already exists`);
  } else {
    name = await uniqueName(model.id, slugify(title, { lower: true, strict: true }) || 'fragment');
  }

  const incoming = body.data || {};
  assertKnownKeys(model, incoming);
  const data = await validateData(model, incoming);

  const info = await db.run(
    'INSERT INTO cf_fragments (model_id, name, title, status, data_json) VALUES (?, ?, ?, ?, ?)',
    [model.id, name, title, status, JSON.stringify(data)]
  );
  return getFragmentById(info.lastInsertRowid);
}

// Partial update: only the keys present in body.data are changed (null
// clears a field). With replace=true the whole data object is replaced
// (used by import). Result is re-validated in full, so required fields and
// types are always enforced.
async function updateFragment(id, body, { replace = false } = {}) {
  const existing = await getFragmentById(id);
  const model = await getModelById(existing.modelId);

  const title = body.title !== undefined ? cleanString(body.title, 200) : existing.title;
  if (!title) throw new ApiError(400, 'Title is required');

  const status = body.status !== undefined ? body.status : existing.status;
  if (!STATUSES.includes(status)) throw new ApiError(400, `Status must be one of: ${STATUSES.join(', ')}`);

  let name = existing.name;
  if (body.name !== undefined && body.name !== existing.name) {
    name = cleanString(body.name, 100);
    if (!FRAGMENT_NAME_RE.test(name)) throw new ApiError(400, 'Name may only contain lowercase letters, digits, "-" and "_"');
    const hit = await db.get('SELECT id FROM cf_fragments WHERE model_id = ? AND name = ? AND id != ?', [model.id, name, id]);
    if (hit) throw new ApiError(409, `A ${model.apiName} named "${name}" already exists`);
  }

  const incoming = body.data || {};
  assertKnownKeys(model, incoming);
  const known = new Set(model.fields.map((f) => f.name));
  const base = replace ? {} : Object.fromEntries(Object.entries(existing.data).filter(([k]) => known.has(k)));
  const data = await validateData(model, { ...base, ...incoming });

  await db.run(
    "UPDATE cf_fragments SET name = ?, title = ?, status = ?, data_json = ?, updated_at = datetime('now') WHERE id = ?",
    [name, title, status, JSON.stringify(data), id]
  );
  return getFragmentById(id);
}

async function deleteFragment(id) {
  await getFragmentById(id);
  await db.run('DELETE FROM cf_fragments WHERE id = ?', [id]);
}

// ---------------------------------------------------------------------------
// Export / import (used by the site export bundle)
// References travel as "/Model/name" paths, since numeric ids are not
// stable between databases.
// ---------------------------------------------------------------------------

async function exportContent() {
  const models = await listModels();
  const modelsById = new Map(models.map((m) => [m.id, m]));
  const rows = await db.all(
    'SELECT f.*, m.api_name AS m_api FROM cf_fragments f JOIN cf_models m ON m.id = f.model_id ORDER BY f.id'
  );
  const idToPath = new Map(rows.map((r) => [r.id, `/${r.m_api}/${r.name}`]));

  const fragments = rows.map((r) => {
    const model = modelsById.get(r.model_id);
    const data = JSON.parse(r.data_json || '{}');
    for (const f of model.fields) {
      if (f.type !== 'reference' || data[f.name] == null) continue;
      data[f.name] = f.multiple
        ? data[f.name].map((id) => idToPath.get(id)).filter(Boolean)
        : idToPath.get(data[f.name]) || null;
    }
    return { model: r.m_api, name: r.name, title: r.title, status: r.status, data };
  });

  return {
    models: models.map((m) => ({ name: m.name, apiName: m.apiName, description: m.description, fields: m.fields })),
    fragments,
  };
}

async function importContent({ models = [], fragments = [] }) {
  const errors = [];
  const bundleApiNames = models.map((m) => m.apiName);

  let modelsImported = 0;
  for (const m of models) {
    try {
      const existing = await getModelByApiName(m.apiName);
      if (existing) {
        await updateModel(existing.id, { name: m.name, description: m.description, fields: m.fields }, { extraKnownApiNames: bundleApiNames });
      } else {
        await createModel(m, { extraKnownApiNames: bundleApiNames });
      }
      modelsImported += 1;
    } catch (e) {
      errors.push(`Model ${m.apiName}: ${e.message}`);
    }
  }

  // Pass 1: make sure a row exists for every fragment so references between
  // fragments (including cycles) can be resolved to ids.
  const placeholders = new Set();
  for (const fr of fragments) {
    const model = await getModelByApiName(fr.model);
    if (!model) { errors.push(`Fragment ${fr.name}: unknown model "${fr.model}"`); continue; }
    if (!FRAGMENT_NAME_RE.test(fr.name || '')) { errors.push(`Fragment "${fr.name}": invalid name`); continue; }
    const row = await db.get('SELECT id FROM cf_fragments WHERE model_id = ? AND name = ?', [model.id, fr.name]);
    if (!row) {
      await db.run("INSERT INTO cf_fragments (model_id, name, title, status, data_json) VALUES (?, ?, ?, 'draft', '{}')", [
        model.id, fr.name, cleanString(fr.title, 200) || fr.name,
      ]);
      placeholders.add(`/${fr.model}/${fr.name}`);
    }
  }

  // Pass 2: real, fully validated write of each fragment.
  let fragmentsImported = 0;
  for (const fr of fragments) {
    const path = `/${fr.model}/${fr.name}`;
    const target = await findFragmentByPath(path);
    const model = await getModelByApiName(fr.model);
    if (!target || !model) continue;
    try {
      const data = { ...(fr.data || {}) };
      for (const f of model.fields) {
        if (f.type !== 'reference' || data[f.name] == null) continue;
        const toId = async (p) => (await findFragmentByPath(p))?.id ?? null;
        data[f.name] = f.multiple
          ? (await Promise.all([].concat(data[f.name]).map(toId))).filter((x) => x !== null)
          : await toId(data[f.name]);
      }
      await updateFragment(target.id, { title: fr.title, status: fr.status, data }, { replace: true });
      fragmentsImported += 1;
    } catch (e) {
      errors.push(`Fragment ${path}: ${e.message}`);
      if (placeholders.has(path)) await db.run('DELETE FROM cf_fragments WHERE id = ?', [target.id]);
    }
  }

  return { modelsImported, fragmentsImported, errors };
}

module.exports = {
  FIELD_TYPES,
  STATUSES,
  listModels,
  getModelById,
  getModelByApiName,
  createModel,
  updateModel,
  deleteModel,
  schemaVersionKey,
  findFragmentById,
  getFragmentById,
  findFragmentByPath,
  queryFragments,
  listFragmentsAdmin,
  createFragment,
  updateFragment,
  deleteFragment,
  exportContent,
  importContent,
  lowerFirst,
};
