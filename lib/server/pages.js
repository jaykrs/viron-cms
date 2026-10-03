const slugify = require('slugify');
const db = require('./db');
const cache = require('./cache');
const { ApiError } = require('./errors');
const { getTheme } = require('./theme');
const { DEFAULT_LOCALE, LOCALE_CATALOG } = require('../localeCatalog');

// A slug whose first path segment is a known language code (e.g. "fr", or
// "fr/about") would be indistinguishable from a locale-prefixed URL, so it's
// rejected up front rather than creating an unreachable/ambiguous page.
function assertSlugLocaleSafe(slug) {
  const first = slug.split('/')[0];
  if (LOCALE_CATALOG.some((l) => l.code === first)) {
    throw new ApiError(400, `Slug cannot start with "${first}" — that is reserved as a language prefix`);
  }
}

async function getBlocks(pageId) {
  const rows = await db.all('SELECT * FROM page_blocks WHERE page_id = ? ORDER BY position ASC', [pageId]);
  return rows.map((b) => ({ ...b, props: JSON.parse(b.props_json || '{}'), props_json: undefined }));
}

async function getComponentRow(id) {
  if (!id) return null;
  const row = await db.get('SELECT * FROM components WHERE id = ?', [id]);
  if (!row) return null;
  return { ...row, props: JSON.parse(row.props_json || '{}'), props_json: undefined };
}

async function serializePage(row, { withBlocks = false, withLayout = false } = {}) {
  const page = {
    ...row,
    seo: {
      title: row.seo_title,
      description: row.seo_description,
      ogImage: row.seo_og_image,
      keywords: row.seo_keywords,
      canonical: row.seo_canonical,
      noIndex: !!row.seo_no_index,
    },
    showInNav: !!row.show_in_nav,
  };
  if (withBlocks) page.blocks = await getBlocks(row.id);
  if (withLayout) {
    // Falls back to the theme's site-wide default header/footer when a page
    // doesn't specify its own — this is what makes the theme's layout
    // choice apply across every page unless a page explicitly overrides it.
    const theme = await getTheme();
    page.header = (await getComponentRow(row.header_id)) || (await getComponentRow(theme.defaultHeaderId));
    page.footer = (await getComponentRow(row.footer_id)) || (await getComponentRow(theme.defaultFooterId));
  }
  return page;
}

// ---------- Admin ----------

async function listPages({ locale } = {}) {
  const rows = locale
    ? await db.all('SELECT * FROM pages WHERE locale = ? ORDER BY nav_order ASC, id ASC', [locale])
    : await db.all('SELECT * FROM pages ORDER BY locale ASC, nav_order ASC, id ASC');
  return Promise.all(rows.map((r) => serializePage(r)));
}

async function getPageById(id) {
  const row = await db.get('SELECT * FROM pages WHERE id = ?', [id]);
  if (!row) throw new ApiError(404, 'Page not found');
  return serializePage(row, { withBlocks: true, withLayout: true });
}

// Every other page sharing this page's slug in a different language — used
// by the admin "Translations" panel and by the public language switcher.
async function listTranslations(id) {
  const page = await getPageById(id);
  const rows = await db.all('SELECT id, locale, title, status FROM pages WHERE slug = ? AND id != ? ORDER BY locale', [
    page.slug,
    id,
  ]);
  return rows;
}

async function createPage(body) {
  const {
    title,
    slug,
    locale = DEFAULT_LOCALE,
    routeType = 'static',
    paramName = null,
    navLabel,
    showInNav = true,
    headerId = null,
    footerId = null,
  } = body || {};
  if (!title) throw new ApiError(400, 'title is required');
  const finalSlug = slug ? slug.replace(/^\/+/, '') : slugify(title, { lower: true, strict: true });
  assertSlugLocaleSafe(finalSlug);

  try {
    const info = await db.run(
      `INSERT INTO pages (title, slug, locale, route_type, param_name, nav_label, show_in_nav, header_id, footer_id, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [title, finalSlug, locale, routeType, paramName, navLabel || title, showInNav ? 1 : 0, headerId, footerId]
    );
    await cache.del('render:*');
    await cache.del('nav:*');
    const row = await db.get('SELECT * FROM pages WHERE id = ?', [info.lastInsertRowid]);
    return serializePage(row);
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      throw new ApiError(409, `Slug "${finalSlug}" is already in use for language "${locale}"`);
    }
    throw err;
  }
}

async function updatePage(id, b) {
  const existing = await db.get('SELECT * FROM pages WHERE id = ?', [id]);
  if (!existing) throw new ApiError(404, 'Page not found');

  const merged = {
    title: b.title ?? existing.title,
    slug: b.slug ? b.slug.replace(/^\/+/, '') : existing.slug,
    locale: b.locale ?? existing.locale,
    route_type: b.routeType ?? existing.route_type,
    param_name: b.paramName ?? existing.param_name,
    nav_label: b.navLabel ?? existing.nav_label,
    nav_order: b.navOrder ?? existing.nav_order,
    show_in_nav: typeof b.showInNav === 'boolean' ? (b.showInNav ? 1 : 0) : existing.show_in_nav,
    header_id: b.headerId ?? existing.header_id,
    footer_id: b.footerId ?? existing.footer_id,
    seo_title: b.seo?.title ?? existing.seo_title,
    seo_description: b.seo?.description ?? existing.seo_description,
    seo_og_image: b.seo?.ogImage ?? existing.seo_og_image,
    seo_keywords: b.seo?.keywords ?? existing.seo_keywords,
    seo_canonical: b.seo?.canonical ?? existing.seo_canonical,
    seo_no_index: typeof b.seo?.noIndex === 'boolean' ? (b.seo.noIndex ? 1 : 0) : existing.seo_no_index,
  };
  assertSlugLocaleSafe(merged.slug);

  try {
    await db.run(
      `UPDATE pages SET title=?, slug=?, locale=?, route_type=?, param_name=?, nav_label=?, nav_order=?, show_in_nav=?,
       header_id=?, footer_id=?, seo_title=?, seo_description=?, seo_og_image=?, seo_keywords=?, seo_canonical=?,
       seo_no_index=?, updated_at=datetime('now') WHERE id=?`,
      [
        merged.title, merged.slug, merged.locale, merged.route_type, merged.param_name, merged.nav_label,
        merged.nav_order, merged.show_in_nav, merged.header_id, merged.footer_id, merged.seo_title,
        merged.seo_description, merged.seo_og_image, merged.seo_keywords, merged.seo_canonical,
        merged.seo_no_index, id,
      ]
    );

    if (Array.isArray(b.blocks)) {
      await replaceBlocks(id, b.blocks);
    }

    await cache.del('render:*');
    await cache.del('nav:*');
    const row = await db.get('SELECT * FROM pages WHERE id = ?', [id]);
    return serializePage(row, { withBlocks: true, withLayout: true });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      throw new ApiError(409, `Slug "${merged.slug}" is already in use for language "${merged.locale}"`);
    }
    throw err;
  }
}

// Creates a new page in targetLocale, copying this page's blocks, SEO,
// header/footer, and nav settings as a starting point for translation.
// The copy is always created as a draft, regardless of the source's status.
async function duplicatePageForLocale(id, targetLocale) {
  const source = await getPageById(id);
  if (targetLocale === source.locale) throw new ApiError(400, 'Choose a different language to translate into');

  const existing = await db.get('SELECT id FROM pages WHERE slug = ? AND locale = ?', [source.slug, targetLocale]);
  if (existing) throw new ApiError(409, `A ${targetLocale} version of this page already exists`);

  const info = await db.run(
    `INSERT INTO pages (title, slug, locale, route_type, param_name, nav_label, nav_order, show_in_nav,
     header_id, footer_id, seo_title, seo_description, seo_og_image, seo_keywords, seo_canonical, seo_no_index,
     updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      source.title, source.slug, targetLocale, source.route_type, source.param_name, source.nav_label,
      source.nav_order, source.showInNav ? 1 : 0, source.header_id, source.footer_id, source.seo.title,
      source.seo.description, source.seo.ogImage, source.seo.keywords, source.seo.canonical,
      source.seo.noIndex ? 1 : 0,
    ]
  );
  await replaceBlocks(info.lastInsertRowid, source.blocks.map((b) => ({ type: b.type, props: b.props })));
  await cache.del('render:*');
  await cache.del('nav:*');
  return getPageById(info.lastInsertRowid);
}

// Deletes a page's existing blocks and inserts the given list, as one
// transaction — used by updatePage, translation, and site import.
async function replaceBlocks(pageId, blocks) {
  const statements = [{ sql: 'DELETE FROM page_blocks WHERE page_id = ?', args: [pageId] }];
  blocks.forEach((blk, i) => {
    statements.push({
      sql: 'INSERT INTO page_blocks (page_id, type, position, props_json) VALUES (?, ?, ?, ?)',
      args: [pageId, blk.type, i, JSON.stringify(blk.props || {})],
    });
  });
  await db.batch(statements);
}

async function publishPage(id) {
  const existing = await db.get('SELECT * FROM pages WHERE id = ?', [id]);
  if (!existing) throw new ApiError(404, 'Page not found');
  await db.run(
    "UPDATE pages SET status = 'published', published_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
    [id]
  );
  await cache.del('render:*');
  await cache.del('nav:*');
  const row = await db.get('SELECT * FROM pages WHERE id = ?', [id]);
  return serializePage(row);
}

async function unpublishPage(id) {
  const existing = await db.get('SELECT * FROM pages WHERE id = ?', [id]);
  if (!existing) throw new ApiError(404, 'Page not found');
  await db.run("UPDATE pages SET status = 'draft', updated_at = datetime('now') WHERE id = ?", [id]);
  await cache.del('render:*');
  await cache.del('nav:*');
  const row = await db.get('SELECT * FROM pages WHERE id = ?', [id]);
  return serializePage(row);
}

async function deletePage(id) {
  // explicit child delete: don't depend on the FK pragma persisting per connection
  await db.run('DELETE FROM page_blocks WHERE page_id = ?', [id]);
  await db.run('DELETE FROM pages WHERE id = ?', [id]);
  await cache.del('render:*');
  await cache.del('nav:*');
}

// ---------- Public ----------

async function getPublicNav() {
  const cacheKey = 'nav:main';
  const hit = await cache.get(cacheKey);
  if (hit) return { ...hit, cached: true, cacheBackend: cache.backend() };

  const rows = await db.all(
    "SELECT id, title, slug, nav_label, nav_order FROM pages WHERE status = 'published' AND show_in_nav = 1 AND route_type = 'static' ORDER BY nav_order ASC, id ASC"
  );
  const nav = rows.map((r) => ({ label: r.nav_label || r.title, href: '/' + r.slug.replace(/^home$/, '') }));
  await cache.set(cacheKey, { items: nav }, 120);
  return { items: nav, cached: false, cacheBackend: cache.backend() };
}

// Tries the requested locale first; if nothing matches there, falls back to
// the default locale's content under the same path (so a URL like /fr/about
// still renders — in English — rather than 404ing just because the French
// translation doesn't exist yet). The locale actually served is returned as
// `resolvedLocale` so the caller can tell the two cases apart if it wants to.
async function resolvePublicPage(locale, segments) {
  const requestedLocale = locale || DEFAULT_LOCALE;
  const requestedPath = (segments || []).join('/') || 'home';
  const cacheKey = `render:${requestedLocale}:${requestedPath}`;

  const cached = await cache.get(cacheKey);
  if (cached) return { ...cached, cached: true, cacheBackend: cache.backend() };

  async function findIn(loc) {
    const rows = await db.all("SELECT * FROM pages WHERE status = 'published' AND locale = ?", [loc]);
    let match = rows.find((r) => r.route_type === 'static' && r.slug.replace(/^\/+/, '') === requestedPath);
    let params = {};
    if (!match) {
      const reqParts = requestedPath.split('/').filter(Boolean);
      for (const r of rows.filter((r) => r.route_type === 'dynamic')) {
        const patternParts = r.slug.split('/').filter(Boolean);
        if (patternParts.length !== reqParts.length) continue;
        const candidateParams = {};
        const isMatch = patternParts.every((part, i) => {
          if (part.startsWith(':')) {
            candidateParams[part.slice(1)] = reqParts[i];
            return true;
          }
          return part === reqParts[i];
        });
        if (isMatch) {
          match = r;
          params = candidateParams;
          break;
        }
      }
    }
    return match ? { match, params } : null;
  }

  let found = await findIn(requestedLocale);
  let resolvedLocale = requestedLocale;
  if (!found && requestedLocale !== DEFAULT_LOCALE) {
    found = await findIn(DEFAULT_LOCALE);
    resolvedLocale = DEFAULT_LOCALE;
  }
  if (!found) throw new ApiError(404, 'Page not found');

  const page = await serializePage(found.match, { withBlocks: true, withLayout: true });
  const payload = { page, params: found.params, requestedLocale, resolvedLocale };
  await cache.set(cacheKey, payload, 60);
  return { ...payload, cached: false, cacheBackend: cache.backend() };
}

// Static, published pages only — dynamic (":param") pages have unbounded
// possible URLs and are intentionally left out of the generated sitemap.
async function listPublicSitemapEntries() {
  const rows = await db.all(
    "SELECT slug, locale, updated_at FROM pages WHERE status = 'published' AND route_type = 'static' ORDER BY nav_order ASC"
  );
  return rows.map((r) => ({ slug: r.slug, locale: r.locale, updatedAt: r.updated_at }));
}

// Human-readable sitemap page data — includes dynamic template pages too
// (shown as a pattern, not a link, since their real URLs aren't enumerable).
async function listPublicPagesForSitemap() {
  return db.all(
    "SELECT title, slug, locale, route_type FROM pages WHERE status = 'published' ORDER BY nav_order ASC, id ASC"
  );
}

// ---------- Export / import ----------

// Every page with its blocks, referencing header/footer by NAME rather
// than numeric id — ids aren't stable across databases/instances, names are.
async function listAllPagesForExport() {
  const rows = await db.all('SELECT * FROM pages ORDER BY nav_order ASC, id ASC');
  return Promise.all(
    rows.map(async (row) => {
      const header = await getComponentRow(row.header_id);
      const footer = await getComponentRow(row.footer_id);
      const blocks = await getBlocks(row.id);
      return {
        title: row.title,
        slug: row.slug,
        locale: row.locale,
        routeType: row.route_type,
        paramName: row.param_name,
        status: row.status,
        navLabel: row.nav_label,
        navOrder: row.nav_order,
        showInNav: !!row.show_in_nav,
        headerName: header?.name || null,
        footerName: footer?.name || null,
        seo: {
          title: row.seo_title,
          description: row.seo_description,
          ogImage: row.seo_og_image,
          keywords: row.seo_keywords,
          canonical: row.seo_canonical,
          noIndex: !!row.seo_no_index,
        },
        blocks: blocks.map((b) => ({ type: b.type, props: b.props })),
      };
    })
  );
}

// Upserts a page by (locale, slug) from an export bundle entry (header/footer
// already resolved to ids by the caller, which owns the name->id lookup).
async function importPage(entry, headerId, footerId) {
  const locale = entry.locale || DEFAULT_LOCALE;
  const existing = await db.get('SELECT id FROM pages WHERE slug = ? AND locale = ?', [entry.slug, locale]);
  const seo = entry.seo || {};

  let pageId;
  if (existing) {
    pageId = existing.id;
    await db.run(
      `UPDATE pages SET title=?, route_type=?, param_name=?, status=?, header_id=?, footer_id=?,
       seo_title=?, seo_description=?, seo_og_image=?, seo_keywords=?, seo_canonical=?, seo_no_index=?,
       nav_label=?, nav_order=?, show_in_nav=?, updated_at=datetime('now') WHERE id=?`,
      [
        entry.title, entry.routeType || 'static', entry.paramName || null,
        entry.status === 'published' ? 'published' : 'draft', headerId, footerId,
        seo.title || entry.title, seo.description || '', seo.ogImage || null, seo.keywords || '',
        seo.canonical || null, seo.noIndex ? 1 : 0, entry.navLabel || entry.title, entry.navOrder || 0,
        entry.showInNav ? 1 : 0, pageId,
      ]
    );
  } else {
    const info = await db.run(
      `INSERT INTO pages (title, slug, locale, route_type, param_name, status, header_id, footer_id, seo_title,
       seo_description, seo_og_image, seo_keywords, seo_canonical, seo_no_index, nav_label, nav_order,
       show_in_nav, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        entry.title, entry.slug, locale, entry.routeType || 'static', entry.paramName || null,
        entry.status === 'published' ? 'published' : 'draft', headerId, footerId,
        seo.title || entry.title, seo.description || '', seo.ogImage || null, seo.keywords || '',
        seo.canonical || null, seo.noIndex ? 1 : 0, entry.navLabel || entry.title, entry.navOrder || 0,
        entry.showInNav ? 1 : 0,
      ]
    );
    pageId = info.lastInsertRowid;
  }

  if (Array.isArray(entry.blocks)) {
    await replaceBlocks(pageId, entry.blocks);
  }
  return pageId;
}

module.exports = {
  ApiError,
  listPages,
  getPageById,
  listTranslations,
  createPage,
  updatePage,
  duplicatePageForLocale,
  publishPage,
  unpublishPage,
  deletePage,
  getPublicNav,
  resolvePublicPage,
  listPublicSitemapEntries,
  listPublicPagesForSitemap,
  listAllPagesForExport,
  importPage,
};
