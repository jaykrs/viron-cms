const {
  GraphQLSchema, GraphQLObjectType, GraphQLInputObjectType, GraphQLString, GraphQLInt, GraphQLFloat,
  GraphQLBoolean, GraphQLID, GraphQLList, GraphQLNonNull, GraphQLScalarType, GraphQLError, Kind,
  parse, validate, execute, getOperationAST, printSchema,
} = require('graphql');
const cf = require('./contentFragments');

const MAX_QUERY_LENGTH = 20000;
const MAX_DEPTH = 10;
const MAX_FIELDS = 300;

// ---------------------------------------------------------------------------
// Scalars & helpers
// ---------------------------------------------------------------------------

function literalToValue(ast, vars) {
  switch (ast.kind) {
    case Kind.STRING: case Kind.BOOLEAN: case Kind.ENUM: return ast.value;
    case Kind.INT: case Kind.FLOAT: return Number(ast.value);
    case Kind.NULL: return null;
    case Kind.LIST: return ast.values.map((v) => literalToValue(v, vars));
    case Kind.OBJECT: {
      const o = {};
      ast.fields.forEach((f) => { o[f.name.value] = literalToValue(f.value, vars); });
      return o;
    }
    case Kind.VARIABLE: return vars ? vars[ast.name.value] : undefined;
    default: return undefined;
  }
}

const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'Any JSON value',
  serialize: (v) => v,
  parseValue: (v) => v,
  parseLiteral: literalToValue,
});

const CODES = { 400: 'BAD_USER_INPUT', 401: 'UNAUTHENTICATED', 404: 'NOT_FOUND', 409: 'CONFLICT' };

function toGraphQLError(err) {
  if (err instanceof GraphQLError) return err;
  if (err && err.status) {
    return new GraphQLError(err.message, { extensions: { code: CODES[err.status] || 'BAD_REQUEST' } });
  }
  console.error(err);
  return new GraphQLError('Internal server error', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
}

// Wraps a resolver so service-layer errors become clean GraphQL errors.
const guard = (fn) => async (src, args, ctx, info) => {
  try {
    return await fn(src, args, ctx, info);
  } catch (err) {
    throw toGraphQLError(err);
  }
};

// Defense in depth: the HTTP layer already rejects unauthenticated
// mutations, but every mutating resolver checks again.
function requireUser(ctx) {
  if (!ctx.user) {
    throw new GraphQLError('Authentication required: send a valid "Authorization: Bearer <token>" header', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
}

const scalarFor = (field) => {
  switch (field.type) {
    case 'number': return GraphQLFloat;
    case 'integer': return GraphQLInt;
    case 'boolean': return GraphQLBoolean;
    case 'json': return JSONScalar;
    default: return GraphQLString;
  }
};

// Stored data might predate a field-type change; never let one bad value
// break a whole query.
function coerceOut(field, v) {
  switch (field.type) {
    case 'number': return typeof v === 'number' && Number.isFinite(v) ? v : null;
    case 'integer': return Number.isInteger(v) ? v : null;
    case 'boolean': return typeof v === 'boolean' ? v : null;
    case 'json': return v;
    default: return typeof v === 'string' ? v : null;
  }
}

// ---------------------------------------------------------------------------
// Schema construction
// ---------------------------------------------------------------------------

function buildSchemaFromModels(models) {
  const objectTypes = {};
  const inputTypes = {};
  const listTypes = {};

  // Per-request memoised lookup + visibility rule: anonymous callers only
  // ever see published fragments, authenticated callers see everything.
  const visible = (ctx, frag) => frag && (ctx.user || frag.status === 'published') ? frag : null;

  const metaFields = {
    _id: { type: new GraphQLNonNull(GraphQLID), resolve: (f) => String(f.id) },
    _path: { type: new GraphQLNonNull(GraphQLString), resolve: (f) => f.path },
    _name: { type: new GraphQLNonNull(GraphQLString), resolve: (f) => f.name },
    _title: { type: new GraphQLNonNull(GraphQLString), resolve: (f) => f.title },
    _status: { type: new GraphQLNonNull(GraphQLString), resolve: (f) => f.status },
    _model: { type: new GraphQLNonNull(GraphQLString), resolve: (f) => f.modelApiName },
    _createdAt: { type: GraphQLString, resolve: (f) => f.createdAt },
    _updatedAt: { type: GraphQLString, resolve: (f) => f.updatedAt },
  };

  // Object type per model (thunked so models can reference each other).
  for (const model of models) {
    objectTypes[model.apiName] = new GraphQLObjectType({
      name: model.apiName,
      description: model.description || `${model.name} content fragment`,
      fields: () => {
        const fields = { ...metaFields };
        for (const field of model.fields) {
          const isRef = field.type === 'reference';
          const base = isRef ? objectTypes[field.refModel] || GraphQLID : scalarFor(field);
          fields[field.name] = {
            description: field.helpText || field.label,
            type: field.multiple ? new GraphQLList(new GraphQLNonNull(base)) : base,
            resolve: guard(async (frag, _args, ctx) => {
              const raw = frag.data ? frag.data[field.name] : undefined;
              if (raw === undefined || raw === null) return field.multiple ? [] : null;
              const one = async (v) => {
                if (!isRef) return coerceOut(field, v);
                const target = visible(ctx, await ctx.loadFragment(v));
                if (!target) return null;
                if (field.refModel && target.modelApiName !== field.refModel) return null;
                return objectTypes[field.refModel] ? target : String(target.id);
              };
              if (field.multiple) {
                const arr = Array.isArray(raw) ? raw : [raw];
                return (await Promise.all(arr.map(one))).filter((x) => x !== null);
              }
              return one(raw);
            }),
          };
        }
        return fields;
      },
    });

    inputTypes[model.apiName] = new GraphQLInputObjectType({
      name: `${model.apiName}Input`,
      description: `Field values for a ${model.name}. Omitted or null fields are cleared/left unset; required fields are enforced by the server.`,
      fields: () => {
        const fields = {};
        for (const field of model.fields) {
          const base = field.type === 'reference' ? GraphQLID : scalarFor(field);
          fields[field.name] = {
            description: field.helpText || field.label,
            type: field.multiple ? new GraphQLList(new GraphQLNonNull(base)) : base,
          };
        }
        return fields;
      },
    });

    listTypes[model.apiName] = new GraphQLObjectType({
      name: `${model.apiName}List`,
      fields: {
        items: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(objectTypes[model.apiName]))) },
        total: { type: new GraphQLNonNull(GraphQLInt), description: 'Total matches, ignoring limit/offset' },
      },
    });
  }

  // Fixed part: model introspection for content clients.
  const ContentModelType = new GraphQLObjectType({
    name: 'ContentModel',
    fields: {
      id: { type: new GraphQLNonNull(GraphQLID), resolve: (m) => String(m.id) },
      name: { type: new GraphQLNonNull(GraphQLString) },
      apiName: { type: new GraphQLNonNull(GraphQLString) },
      description: { type: GraphQLString },
      fields: { type: new GraphQLNonNull(JSONScalar), description: 'Ordered field definitions' },
      createdAt: { type: GraphQLString },
      updatedAt: { type: GraphQLString },
    },
  });

  const queryFields = {
    contentModels: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(ContentModelType))),
      description: 'All content models (schemas) defined in this CMS',
      resolve: guard(() => cf.listModels()),
    },
    contentModel: {
      type: ContentModelType,
      args: { apiName: { type: new GraphQLNonNull(GraphQLString) } },
      resolve: guard((_s, { apiName }) => cf.getModelByApiName(apiName)),
    },
  };

  const mutationFields = {
    createContentModel: {
      type: new GraphQLNonNull(ContentModelType),
      description: 'Requires a token. Define a new content model.',
      args: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        apiName: { type: new GraphQLNonNull(GraphQLString) },
        description: { type: GraphQLString },
        fields: { type: new GraphQLNonNull(JSONScalar), description: 'Array of {name,label,type,required,multiple,options,refModel,helpText}' },
      },
      resolve: guard((_s, args, ctx) => { requireUser(ctx); return cf.createModel(args); }),
    },
    updateContentModel: {
      type: new GraphQLNonNull(ContentModelType),
      description: 'Requires a token. apiName cannot be changed.',
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        name: { type: GraphQLString },
        description: { type: GraphQLString },
        fields: { type: JSONScalar },
      },
      resolve: guard((_s, { id, ...body }, ctx) => { requireUser(ctx); return cf.updateModel(Number(id), body); }),
    },
    deleteContentModel: {
      type: new GraphQLNonNull(GraphQLBoolean),
      description: 'Requires a token. Fails if fragments exist unless force is true.',
      args: { id: { type: new GraphQLNonNull(GraphQLID) }, force: { type: GraphQLBoolean } },
      resolve: guard(async (_s, { id, force }, ctx) => {
        requireUser(ctx);
        await cf.deleteModel(Number(id), { force: !!force });
        return true;
      }),
    },
  };

  // Per-model queries and mutations.
  for (const model of models) {
    const A = model.apiName;
    const L = cf.lowerFirst(A);
    const T = objectTypes[A];

    queryFields[`${L}List`] = {
      type: new GraphQLNonNull(listTypes[A]),
      description: `List ${model.name} fragments. Anonymous callers only see published ones.`,
      args: {
        limit: { type: GraphQLInt, description: 'Default 50, max 100' },
        offset: { type: GraphQLInt },
        sortBy: { type: GraphQLString, description: 'A field key, or _title/_name/_createdAt/_updatedAt' },
        sortDir: { type: GraphQLString, description: 'asc or desc (default desc)' },
        filter: { type: JSONScalar, description: 'e.g. {"category":"AI"} or {"headline":{"contains":"cloud"}}. Operators: eq, ne, contains, startsWith, gt, gte, lt, lte, in' },
      },
      resolve: guard((_s, args, ctx) => cf.queryFragments({ model, ...args, publishedOnly: !ctx.user })),
    };
    queryFields[`${L}ById`] = {
      type: T,
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: guard(async (_s, { id }, ctx) => {
        const f = visible(ctx, await ctx.loadFragment(id));
        return f && f.modelApiName === A ? f : null;
      }),
    };
    queryFields[`${L}ByPath`] = {
      type: T,
      args: { path: { type: new GraphQLNonNull(GraphQLString), description: `e.g. /${A}/my-fragment` } },
      resolve: guard(async (_s, { path }, ctx) => {
        const f = visible(ctx, await cf.findFragmentByPath(path));
        return f && f.modelApiName === A ? f : null;
      }),
    };

    mutationFields[`create${A}`] = {
      type: new GraphQLNonNull(T),
      description: 'Requires a token.',
      args: {
        title: { type: new GraphQLNonNull(GraphQLString) },
        name: { type: GraphQLString, description: 'URL-safe name; generated from the title if omitted' },
        status: { type: GraphQLString, description: 'draft (default) or published' },
        data: { type: new GraphQLNonNull(inputTypes[A]) },
      },
      resolve: guard((_s, args, ctx) => { requireUser(ctx); return cf.createFragment(model.id, args); }),
    };
    mutationFields[`update${A}`] = {
      type: new GraphQLNonNull(T),
      description: 'Requires a token. Only the fields present in data are changed; null clears a field.',
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        title: { type: GraphQLString },
        name: { type: GraphQLString },
        status: { type: GraphQLString },
        data: { type: inputTypes[A] },
      },
      resolve: guard(async (_s, { id, ...body }, ctx) => {
        requireUser(ctx);
        const existing = await cf.getFragmentById(id);
        if (existing.modelApiName !== A) throw Object.assign(new Error('Content fragment not found'), { status: 404 });
        return cf.updateFragment(existing.id, body);
      }),
    };
    mutationFields[`delete${A}`] = {
      type: new GraphQLNonNull(GraphQLBoolean),
      description: 'Requires a token.',
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: guard(async (_s, { id }, ctx) => {
        requireUser(ctx);
        const existing = await cf.getFragmentById(id);
        if (existing.modelApiName !== A) throw Object.assign(new Error('Content fragment not found'), { status: 404 });
        await cf.deleteFragment(existing.id);
        return true;
      }),
    };
  }

  return new GraphQLSchema({
    query: new GraphQLObjectType({ name: 'Query', fields: queryFields }),
    mutation: new GraphQLObjectType({ name: 'Mutation', fields: mutationFields }),
  });
}

// The schema only changes when models change; a cheap fingerprint query per
// request tells us whether to rebuild (also correct across several server
// instances sharing one Turso database).
let cache = { key: null, schema: null };

async function getSchema() {
  const key = await cf.schemaVersionKey();
  if (cache.schema && cache.key === key) return cache.schema;
  const schema = buildSchemaFromModels(await cf.listModels());
  cache = { key, schema };
  return schema;
}

async function getSchemaSDL() {
  return printSchema(await getSchema());
}

// ---------------------------------------------------------------------------
// Request execution
// ---------------------------------------------------------------------------

// Counts nesting depth and total fields (introspection fields are exempt so
// tools like GraphiQL still work). Protects the public endpoint from
// deeply nested reference chains and alias flooding.
function measure(doc, operation) {
  const fragments = {};
  doc.definitions.forEach((d) => { if (d.kind === Kind.FRAGMENT_DEFINITION) fragments[d.name.value] = d; });
  let fields = 0;
  const walk = (selectionSet, depth, seen) => {
    let max = depth;
    for (const sel of (selectionSet && selectionSet.selections) || []) {
      if (sel.kind === Kind.FIELD) {
        if (sel.name.value.startsWith('__')) continue;
        fields += 1;
        max = Math.max(max, sel.selectionSet ? walk(sel.selectionSet, depth + 1, seen) : depth + 1);
      } else if (sel.kind === Kind.INLINE_FRAGMENT) {
        max = Math.max(max, walk(sel.selectionSet, depth, seen));
      } else if (sel.kind === Kind.FRAGMENT_SPREAD) {
        const name = sel.name.value;
        if (seen.has(name) || !fragments[name]) continue;
        max = Math.max(max, walk(fragments[name].selectionSet, depth, new Set([...seen, name])));
      }
    }
    return max;
  };
  const depth = walk(operation.selectionSet, 0, new Set());
  return { depth, fields };
}

const fail = (status, message, code) => ({
  status,
  body: { errors: [{ message, extensions: { code } }] },
});

// method: 'GET' or 'POST'. Queries are open to everyone; a mutation needs a
// valid token (and must be sent with POST, per the GraphQL-over-HTTP spec).
async function executeGraphQL({ query, variables, operationName, user, method }) {
  if (typeof query !== 'string' || !query.trim()) return fail(400, 'Missing "query"', 'BAD_REQUEST');
  if (query.length > MAX_QUERY_LENGTH) return fail(413, 'Query is too large', 'BAD_REQUEST');
  if (variables !== undefined && variables !== null && (typeof variables !== 'object' || Array.isArray(variables))) {
    return fail(400, '"variables" must be an object', 'BAD_REQUEST');
  }

  let doc;
  try {
    doc = parse(query);
  } catch (err) {
    return { status: 400, body: { errors: [{ message: err.message, locations: err.locations }] } };
  }

  const operation = getOperationAST(doc, operationName || undefined);
  if (operation && operation.operation === 'mutation') {
    if (method !== 'POST') return fail(405, 'Mutations must be sent with POST', 'METHOD_NOT_ALLOWED');
    if (!user) {
      return fail(401, 'Authentication required: send a valid "Authorization: Bearer <token>" header', 'UNAUTHENTICATED');
    }
  }
  if (operation && operation.operation === 'subscription') return fail(400, 'Subscriptions are not supported', 'BAD_REQUEST');

  if (operation) {
    const { depth, fields } = measure(doc, operation);
    if (depth > MAX_DEPTH) return fail(400, `Query is too deep (max depth ${MAX_DEPTH})`, 'QUERY_TOO_COMPLEX');
    if (fields > MAX_FIELDS) return fail(400, `Query selects too many fields (max ${MAX_FIELDS})`, 'QUERY_TOO_COMPLEX');
  }

  const schema = await getSchema();
  const problems = validate(schema, doc);
  if (problems.length) return { status: 400, body: { errors: problems.map((e) => e.toJSON()) } };

  const loaded = new Map();
  const contextValue = {
    user,
    loadFragment: (id) => {
      const key = String(id);
      if (!loaded.has(key)) loaded.set(key, cf.findFragmentById(id));
      return loaded.get(key);
    },
  };

  const result = await execute({
    schema, document: doc, variableValues: variables || undefined, operationName: operationName || undefined, contextValue,
  });
  return { status: 200, body: JSON.parse(JSON.stringify(result)) };
}

module.exports = { executeGraphQL, getSchemaSDL };
