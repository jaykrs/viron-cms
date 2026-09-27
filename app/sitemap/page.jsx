import Link from 'next/link';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { getTheme } from '../../lib/server/theme';
import { getComponentByIdOrNull } from '../../lib/server/components';
import { listPublicPagesForSitemap } from '../../lib/server/pages';

export const metadata = {
  title: 'Sitemap | Vireon Labs',
  description: 'All published pages on this site.',
};

export default async function SitemapPage() {
  const theme = await getTheme();
  const header = await getComponentByIdOrNull(theme.defaultHeaderId);
  const footer = await getComponentByIdOrNull(theme.defaultFooterId);
  const pages = await listPublicPagesForSitemap();

  return (
    <>
      <Header data={header} />
      <main>
        <div className="max-w-content mx-auto px-6 py-16">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-ink">Sitemap</h1>
          <p className="mt-3 text-slate">Every published page on this site.</p>

          <ul className="mt-10 border-t border-hairline">
            {pages.map((p) => {
              const isDynamic = p.route_type === 'dynamic';
              const href = '/' + p.slug.replace(/^home$/, '');
              return (
                <li
                  key={p.slug}
                  className="flex items-baseline justify-between gap-6 border-b border-hairline py-4"
                >
                  {isDynamic ? (
                    <span className="text-ink font-medium">{p.title}</span>
                  ) : (
                    <Link href={href} className="text-ink font-medium hover:text-signal transition-colors">
                      {p.title}
                    </Link>
                  )}
                  <span className="text-xs font-mono text-slate shrink-0">
                    {isDynamic ? `/${p.slug} (dynamic template)` : href}
                  </span>
                </li>
              );
            })}
          </ul>

          <p className="mt-8 text-xs text-slate">
            Looking for the machine-readable version for search engines? See{' '}
            <a href="/sitemap.xml" className="underline hover:text-signal">
              /sitemap.xml
            </a>
            .
          </p>
        </div>
      </main>
      <Footer data={footer} />
    </>
  );
}
