const db = require('./db');
const cache = require('./cache');
const { ApiError } = require('./errors');

// Every supported design: each name maps to a centralized stylesheet that
// defines the exact same component class names (site-header, block-hero__*,
// …), so switching is a pure CSS swap applied via a `data-theme` attribute
// on <html> — see app/layout.js and app/components.css / app/themes/*.css.
const CSS_THEMES = ['classic', 'modern'];

function serialize(row) {
  return {
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    cssTheme: row.css_theme || 'classic',
    defaultHeaderId: row.default_header_id,
    defaultFooterId: row.default_footer_id,
    updatedAt: row.updated_at,
  };
}

async function getTheme() {
  const row = await db.get('SELECT * FROM theme_settings WHERE id = 1');
  return serialize(row);
}

async function updateTheme(body) {
  const existing = await db.get('SELECT * FROM theme_settings WHERE id = 1');
  if (!existing) throw new ApiError(404, 'Theme settings not found');

  const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
  const primary = body.primaryColor ?? existing.primary_color;
  const secondary = body.secondaryColor ?? existing.secondary_color;
  if (!HEX.test(primary) || !HEX.test(secondary)) {
    throw new ApiError(400, 'Colors must be valid hex values, e.g. #3D5AFE');
  }

  const cssTheme = body.cssTheme ?? existing.css_theme ?? 'classic';
  if (!CSS_THEMES.includes(cssTheme)) {
    throw new ApiError(400, `cssTheme must be one of: ${CSS_THEMES.join(', ')}`);
  }

  await db.run(
    `UPDATE theme_settings SET primary_color = ?, secondary_color = ?, css_theme = ?, default_header_id = ?,
     default_footer_id = ?, updated_at = datetime('now') WHERE id = 1`,
    [
      primary,
      secondary,
      cssTheme,
      body.defaultHeaderId ?? existing.default_header_id,
      body.defaultFooterId ?? existing.default_footer_id,
    ]
  );

  await cache.del('render:*');
  const updated = await db.get('SELECT * FROM theme_settings WHERE id = 1');
  return serialize(updated);
}

module.exports = { getTheme, updateTheme, CSS_THEMES };
