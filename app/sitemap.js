import { listPublicSitemapEntries } from '../lib/server/pages';
import { DEFAULT_LOCALE } from '../lib/localeCatalog';

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

function urlFor(locale, slug) {
  const path = slug === 'home' ? '' : `/${slug}`;
  return locale === DEFAULT_LOCALE ? `${SITE_URL}${path || '/'}` : `${SITE_URL}/${locale}${path}`;
}

export default async function sitemap() {
  const entries = await listPublicSitemapEntries();

  return entries.map((entry) => ({
    url: urlFor(entry.locale, entry.slug),
    lastModified: entry.updatedAt,
    changeFrequency: 'weekly',
    priority: entry.slug === 'home' && entry.locale === DEFAULT_LOCALE ? 1 : 0.7,
  }));
}
