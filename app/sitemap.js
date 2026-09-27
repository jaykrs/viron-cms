import { listPublicSitemapEntries } from '../lib/server/pages';

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

export default async function sitemap() {
  const entries = await listPublicSitemapEntries();

  return entries.map((entry) => ({
    url: entry.slug === 'home' ? SITE_URL : `${SITE_URL}/${entry.slug}`,
    lastModified: entry.updatedAt,
    changeFrequency: 'weekly',
    priority: entry.slug === 'home' ? 1 : 0.7,
  }));
}
