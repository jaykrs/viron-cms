const slugify = require('slugify');
const db = require('./db');
const cache = require('./cache');
const { ApiError } = require('./errors');
const { getTheme } = require('./theme');

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

async function listPages() {
  const rows = await db.all('SELECT * FROM pages ORDER BY nav_order ASC, id ASC');
  return Promise.all(rows.map((r) => serializePage(r)));
}

async function getPageById(id) {
  const row = await db.get('SELECT * FROM pages WHERE id = ?', [id]);
  if (!row) throw new ApiError(404, 'Page not found');
  return serializePage(row, { withBlocks: true, withLayout: true });
}

async function createPage(body) {
  const {
    title,
    slug,
    routeType = 'static',
    paramName = null,
    navLabel,
    showInNav = true,
    headerId = null,
    footerId = null,
  } = body || {};
  if (!title) throw new ApiError(400, 'title is required');
  const finalSlug = slug ? slug.replace(/^\/+/, '') : slugify(title, { lower: true, strict: true });

  try {
    const info = await db.run(
      `INSERT INTO pages (title, slug, route_type, param_name, nav_label, show_in_nav, header_id, footer_id, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [title, finalSlug, routeType, paramName, navLabel || title, showInNav ? 1 : 0, headerId, footerId]
    );
    await cache.del('render:*');
    await cache.del('nav:*');
    const row = await db.get('SELECT * FROM pages WHERE id = ?', [info.lastInsertRowid]);
    return serializePage(row);
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) throw new ApiError(409, `Slug "${finalSlug}" is already in use`);
    throw err;
  }
}

async function updatePage(id, b) {
  const existing = await db.get('SELECT * FROM pages WHERE id = ?', [id]);
  if (!existing) throw new ApiError(404, 'Page not found');

  const merged = {
    title: b.title ?? existing.title,
    slug: b.slug ? b.slug.replace(/^\/+/, '') : existing.slug,
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

  try {
    await db.run(
      `UPDATE pages SET title=?, slug=?, route_type=?, param_name=?, nav_label=?, nav_order=?, show_in_nav=?,
       header_id=?, footer_id=?, seo_title=?, seo_description=?, seo_og_image=?, seo_keywords=?, seo_canonical=?,
       seo_no_index=?, updated_at=datetime('now') WHERE id=?`,
      [
        merged.title, merged.slug, merged.route_type, merged.param_name, merged.nav_label, merged.nav_order,
        merged.show_in_nav, merged.header_id, merged.footer_id, merged.seo_title, merged.seo_description,
        merged.seo_og_image, merged.seo_keywords, merged.seo_canonical, merged.seo_no_index, id,
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
    if (String(err.message).includes('UNIQUE')) throw new ApiError(409, `Slug "${merged.slug}" is already in use`);
    throw err;
  }
}

// Deletes a page's existing blocks and inserts the given list, as one
// transaction — used by updatePage and by site import.
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

async function resolvePublicPage(segments) {
  const requestedPath = (segments || []).join('/') || 'home';
  const cacheKey = `render:${requestedPath}`;

  const cached = await cache.get(cacheKey);
  if (cached) return { ...cached, cached: true, cacheBackend: cache.backend() };

  const rows = await db.all("SELECT * FROM pages WHERE status = 'published'");

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

  if (!match) throw new ApiError(404, 'Page not found');

  const page = await serializePage(match, { withBlocks: true, withLayout: true });
  const payload = { page, params };
  await cache.set(cacheKey, payload, 60);
  return { ...payload, cached: false, cacheBackend: cache.backend() };
}

// Static, published pages only — dynamic (":param") pages have unbounded
// possible URLs and are intentionally left out of the generated sitemap.
async function listPublicSitemapEntries() {
  const rows = await db.all(
    "SELECT slug, updated_at FROM pages WHERE status = 'published' AND route_type = 'static' ORDER BY nav_order ASC"
  );
  return rows.map((r) => ({ slug: r.slug, updatedAt: r.updated_at }));
}

// Human-readable sitemap page data — includes dynamic template pages too
// (shown as a pattern, not a link, since their real URLs aren't enumerable).
async function listPublicPagesForSitemap() {
  return db.all(
    "SELECT title, slug, route_type FROM pages WHERE status = 'published' ORDER BY nav_order ASC, id ASC"
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

// Upserts a page by slug from an export bundle entry (header/footer already
// resolved to ids by the caller, which owns the name->id lookup).
async function importPage(entry, headerId, footerId) {
  const existing = await db.get('SELECT id FROM pages WHERE slug = ?', [entry.slug]);
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
      `INSERT INTO pages (title, slug, route_type, param_name, status, header_id, footer_id, seo_title,
       seo_description, seo_og_image, seo_keywords, seo_canonical, seo_no_index, nav_label, nav_order,
       show_in_nav, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        entry.title, entry.slug, entry.routeType || 'static', entry.paramName || null,
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
  createPage,
  updatePage,
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
