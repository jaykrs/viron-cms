const db = require('./db');
const { ApiError } = require('./errors');
const { DEFAULT_LOCALE, LOCALE_CATALOG, LOCALE_CODE_RE, catalogLabel } = require('../localeCatalog');

async function listEnabledLocales() {
  const rows = await db.all('SELECT code, label FROM site_locales ORDER BY (code = ?) DESC, label ASC', [
    DEFAULT_LOCALE,
  ]);
  // Reshape into plain literals: this crosses into Client Component props
  // (the header language switcher), and a raw driver row — even one that
  // looks plain — can trip React's "plain objects only" RSC boundary check.
  const list = rows.map((r) => ({ code: r.code, label: r.label }));
  // Belt and suspenders: English is always present even if the row were
  // ever removed by hand at the database level.
  if (!list.some((r) => r.code === DEFAULT_LOCALE)) {
    list.unshift({ code: DEFAULT_LOCALE, label: catalogLabel(DEFAULT_LOCALE) });
  }
  return list;
}

async function enableLocale(code) {
  const c = String(code || '').toLowerCase();
  if (!LOCALE_CODE_RE.test(c)) throw new ApiError(400, 'Invalid language code');
  if (!LOCALE_CATALOG.some((l) => l.code === c)) throw new ApiError(400, `"${c}" is not in the supported language catalog`);
  await db.run('INSERT OR IGNORE INTO site_locales (code, label) VALUES (?, ?)', [c, catalogLabel(c)]);
  return listEnabledLocales();
}

async function disableLocale(code) {
  const c = String(code || '').toLowerCase();
  if (c === DEFAULT_LOCALE) throw new ApiError(400, 'English is the default language and cannot be removed');
  const { count } = await db.get('SELECT COUNT(*) AS count FROM pages WHERE locale = ?', [c]);
  if (count > 0) {
    throw new ApiError(409, `${count} page(s) still use this language. Delete or re-locale them first.`);
  }
  await db.run('DELETE FROM site_locales WHERE code = ?', [c]);
  return listEnabledLocales();
}

module.exports = { listEnabledLocales, enableLocale, disableLocale };
