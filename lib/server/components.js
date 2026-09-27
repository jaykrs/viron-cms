const db = require('./db');
const cache = require('./cache');
const { ApiError } = require('./errors');

function serialize(row) {
  return { ...row, props: JSON.parse(row.props_json || '{}'), props_json: undefined };
}

async function listComponents(kind) {
  const rows = kind
    ? await db.all('SELECT * FROM components WHERE kind = ? ORDER BY id', [kind])
    : await db.all('SELECT * FROM components ORDER BY id');
  return rows.map(serialize);
}

async function getComponentById(id) {
  const row = await db.get('SELECT * FROM components WHERE id = ?', [id]);
  if (!row) throw new ApiError(404, 'Component not found');
  return serialize(row);
}

// Same as getComponentById but returns null instead of throwing — used
// where a missing/unset component (e.g. a theme default that hasn't been
// configured yet) is a normal, expected case rather than an error.
async function getComponentByIdOrNull(id) {
  if (!id) return null;
  const row = await db.get('SELECT * FROM components WHERE id = ?', [id]);
  return row ? serialize(row) : null;
}

async function getComponentByName(name) {
  const row = await db.get('SELECT * FROM components WHERE name = ?', [name]);
  return row ? serialize(row) : null;
}

async function createComponent({ name, kind, props = {}, is_default = false }) {
  if (!name || !kind) throw new ApiError(400, 'name and kind are required');
  const info = await db.run(
    "INSERT INTO components (name, kind, is_default, props_json, updated_at) VALUES (?, ?, ?, ?, datetime('now'))",
    [name, kind, is_default ? 1 : 0, JSON.stringify(props)]
  );
  await cache.del('render:*');
  const row = await db.get('SELECT * FROM components WHERE id = ?', [info.lastInsertRowid]);
  return serialize(row);
}

async function updateComponent(id, { name, props, is_default }) {
  const existing = await db.get('SELECT * FROM components WHERE id = ?', [id]);
  if (!existing) throw new ApiError(404, 'Component not found');
  await db.run(
    "UPDATE components SET name = ?, props_json = ?, is_default = ?, updated_at = datetime('now') WHERE id = ?",
    [
      name ?? existing.name,
      JSON.stringify(props ?? JSON.parse(existing.props_json)),
      typeof is_default === 'boolean' ? (is_default ? 1 : 0) : existing.is_default,
      id,
    ]
  );
  await cache.del('render:*');
  const row = await db.get('SELECT * FROM components WHERE id = ?', [id]);
  return serialize(row);
}

async function deleteComponent(id) {
  await db.run('DELETE FROM components WHERE id = ?', [id]);
  await cache.del('render:*');
}

module.exports = {
  listComponents,
  getComponentById,
  getComponentByIdOrNull,
  getComponentByName,
  createComponent,
  updateComponent,
  deleteComponent,
};
