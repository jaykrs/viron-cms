const { ApiError } = require('./errors');
const { listAllPagesForExport, importPage } = require('./pages');
const { listComponents, getComponentByName, createComponent, updateComponent } = require('./components');
const { getTheme, updateTheme } = require('./theme');
const cache = require('./cache');

const EXPORT_FORMAT_VERSION = 1;

// A complete, portable snapshot of site content — pages (with blocks and
// SEO), the header/footer component library, and the theme. Visitor/
// analytics data is deliberately excluded: this is a *content* export, not
// a data-privacy export, and visitor emails shouldn't travel between
// environments (e.g. exporting from staging and importing into prod, or
// sharing a bundle with someone else) just because they were "included".
async function exportSite() {
  const [components, pages, theme] = await Promise.all([listComponents(), listAllPagesForExport(), getTheme()]);

  const componentsById = new Map(components.map((c) => [c.id, c]));
  const defaultHeaderName = theme.defaultHeaderId ? componentsById.get(theme.defaultHeaderId)?.name || null : null;
  const defaultFooterName = theme.defaultFooterId ? componentsById.get(theme.defaultFooterId)?.name || null : null;

  return {
    formatVersion: EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    theme: {
      primaryColor: theme.primaryColor,
      secondaryColor: theme.secondaryColor,
      defaultHeaderName,
      defaultFooterName,
    },
    components: components.map((c) => ({ name: c.name, kind: c.kind, props: c.props, isDefault: !!c.is_default })),
    pages,
  };
}

// Upserts everything in the bundle: components matched/created by name,
// pages matched/created by slug (with blocks fully replaced), then the
// theme's colors and default header/footer (also matched by name).
// Nothing existing outside the bundle is deleted — import is additive/
// overwriting, never destructive, so importing a partial bundle is safe.
async function importSite(bundle) {
  if (!bundle || typeof bundle !== 'object') throw new ApiError(400, 'Invalid import file');
  if (!Array.isArray(bundle.pages)) throw new ApiError(400, 'Import file is missing a "pages" array');

  const componentNameToId = new Map();

  for (const c of bundle.components || []) {
    if (!c.name || !c.kind) continue;
    const existing = await getComponentByName(c.name);
    const saved = existing
      ? await updateComponent(existing.id, { name: c.name, props: c.props, is_default: c.isDefault })
      : await createComponent({ name: c.name, kind: c.kind, props: c.props, is_default: c.isDefault });
    componentNameToId.set(c.name, saved.id);
  }

  let pagesImported = 0;
  for (const entry of bundle.pages) {
    if (!entry.slug || !entry.title) continue;
    const headerId = entry.headerName ? componentNameToId.get(entry.headerName) || null : null;
    const footerId = entry.footerName ? componentNameToId.get(entry.footerName) || null : null;
    await importPage(entry, headerId, footerId);
    pagesImported += 1;
  }

  let themeUpdated = false;
  if (bundle.theme) {
    const defaultHeaderId = bundle.theme.defaultHeaderName
      ? componentNameToId.get(bundle.theme.defaultHeaderName) || null
      : undefined;
    const defaultFooterId = bundle.theme.defaultFooterName
      ? componentNameToId.get(bundle.theme.defaultFooterName) || null
      : undefined;
    await updateTheme({
      primaryColor: bundle.theme.primaryColor,
      secondaryColor: bundle.theme.secondaryColor,
      defaultHeaderId,
      defaultFooterId,
    });
    themeUpdated = true;
  }

  await cache.del('render:*');
  await cache.del('nav:*');

  return { componentsImported: componentNameToId.size, pagesImported, themeUpdated };
}

module.exports = { exportSite, importSite };
