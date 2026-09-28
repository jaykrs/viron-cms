const path = require('path');
const { createClient } = require('@libsql/client');

// Works two ways with zero code changes:
// - Local dev / self-hosted (default): TURSO_DATABASE_URL unset, falls back
//   to a local libSQL file at db/cms.db — same file-based simplicity as the
//   previous SQLite setup, no external service required.
// - Turso: set TURSO_DATABASE_URL to your `libsql://...` database URL and
//   TURSO_AUTH_TOKEN to its auth token (both from `turso db show` / `turso
//   db tokens create`) and every query in this app runs against Turso
//   instead, unchanged.
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'db', 'cms.db');
const url = process.env.TURSO_DATABASE_URL || `file:${DB_PATH}`;
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient(authToken ? { url, authToken } : { url });

const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  route_type TEXT NOT NULL DEFAULT 'static',
  param_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  header_id INTEGER,
  footer_id INTEGER,
  seo_title TEXT,
  seo_description TEXT,
  seo_og_image TEXT,
  seo_keywords TEXT,
  seo_canonical TEXT,
  seo_no_index INTEGER NOT NULL DEFAULT 0,
  nav_label TEXT,
  nav_order INTEGER NOT NULL DEFAULT 0,
  show_in_nav INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  published_at TEXT,
  FOREIGN KEY (header_id) REFERENCES components(id),
  FOREIGN KEY (footer_id) REFERENCES components(id)
);

CREATE TABLE IF NOT EXISTS components (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  props_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS page_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  props_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  original_name TEXT,
  mime_type TEXT,
  size INTEGER,
  url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS theme_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  primary_color TEXT NOT NULL DEFAULT '#3D5AFE',
  secondary_color TEXT NOT NULL DEFAULT '#F2A93B',
  default_header_id INTEGER,
  default_footer_id INTEGER,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (default_header_id) REFERENCES components(id),
  FOREIGN KEY (default_footer_id) REFERENCES components(id)
);

CREATE TABLE IF NOT EXISTS visitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_uid TEXT NOT NULL UNIQUE,
  email TEXT,
  user_agent TEXT,
  first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS page_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_id INTEGER NOT NULL,
  path TEXT NOT NULL,
  page_title TEXT,
  referrer TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE CASCADE
);

-- Content fragment models: user-defined schemas (AEM-style). fields_json is
-- an ordered array of field definitions; version is bumped on every change
-- so the GraphQL schema cache can detect edits (even from another instance).
CREATE TABLE IF NOT EXISTS cf_models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  api_name TEXT NOT NULL UNIQUE,
  description TEXT,
  fields_json TEXT NOT NULL DEFAULT '[]',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Content fragments: instances of a model. data_json holds the field values.
CREATE TABLE IF NOT EXISTS cf_fragments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  data_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (model_id, name),
  FOREIGN KEY (model_id) REFERENCES cf_models(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_blocks_page ON page_blocks(page_id);
CREATE INDEX IF NOT EXISTS idx_visitors_uid ON visitors(visitor_uid);
CREATE INDEX IF NOT EXISTS idx_page_views_visitor ON page_views(visitor_id);
CREATE INDEX IF NOT EXISTS idx_cf_fragments_model ON cf_fragments(model_id);
`;

// theme_settings needs exactly one row (id=1) to exist before getTheme()'s
// first read — done once here, right after the tables themselves.
const SEED_THEME_ROW = `INSERT OR IGNORE INTO theme_settings (id, primary_color, secondary_color) VALUES (1, '#3D5AFE', '#F2A93B');`;

let initPromise = null;
function ensureInit() {
  if (!initPromise) {
    initPromise = client.executeMultiple(SCHEMA_SQL + '\n' + SEED_THEME_ROW);
  }
  return initPromise;
}

// Thin async helpers so the rest of the codebase reads almost exactly like
// the previous synchronous better-sqlite3 version (`db.get(sql, args)`
// instead of `db.prepare(sql).get(...args)`), just with await added.
async function get(sql, args = []) {
  await ensureInit();
  const result = await client.execute({ sql, args });
  return result.rows[0];
}

async function all(sql, args = []) {
  await ensureInit();
  const result = await client.execute({ sql, args });
  return result.rows;
}

async function run(sql, args = []) {
  await ensureInit();
  const result = await client.execute({ sql, args });
  return {
    lastInsertRowid: result.lastInsertRowid != null ? Number(result.lastInsertRowid) : undefined,
    changes: result.rowsAffected,
  };
}

// Runs a list of {sql, args} statements as a single write transaction —
// used where several inserts/updates must succeed or fail together (e.g.
// replacing a page's content blocks, or a full site import).
async function batch(statements) {
  await ensureInit();
  if (statements.length === 0) return;
  await client.batch(
    statements.map((s) => ({ sql: s.sql, args: s.args || [] })),
    'write'
  );
}

module.exports = { get, all, run, batch, client };
