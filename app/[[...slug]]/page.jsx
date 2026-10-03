import { notFound } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { renderBlocks, substituteText, localizeHrefs } from '../../components/ComponentRenderer';
import { resolvePublicPage, listTranslations } from '../../lib/server/pages';
import { listEnabledLocales } from '../../lib/server/locales';
import { DEFAULT_LOCALE } from '../../lib/localeCatalog';

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

// A URL's first segment counts as a locale prefix only if it's a language
// this site actually has turned on — anything else is just the first part
// of an ordinary (English) slug.
async function splitLocale(slugParts) {
  const enabledLocales = await listEnabledLocales();
  const codes = enabledLocales.map((l) => l.code);
  const parts = slugParts || [];
  if (parts.length > 0 && parts[0] !== DEFAULT_LOCALE && codes.includes(parts[0])) {
    return { locale: parts[0], segments: parts.slice(1), enabledLocales };
  }
  return { locale: DEFAULT_LOCALE, segments: parts, enabledLocales };
}

function urlFor(locale, slug) {
  const path = slug === 'home' ? '' : `/${slug}`;
  return locale === DEFAULT_LOCALE ? `${SITE_URL}${path || '/'}` : `${SITE_URL}/${locale}${path}`;
}

async function resolve(slugParts) {
  const { locale, segments, enabledLocales } = await splitLocale(slugParts);
  try {
    const data = await resolvePublicPage(locale, segments);
    return { ...data, requestedLocale: locale, enabledLocales };
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

export async function generateMetadata({ params }) {
  const data = await resolve(params.slug);
  if (!data) return {};
  const { page, params: routeParams, requestedLocale } = data;
  const title = substituteText(page.seo.title || page.title, routeParams);
  const description = substituteText(page.seo.description || '', routeParams);

  let languages;
  if (page.route_type === 'static') {
    languages = { [page.locale]: urlFor(page.locale, page.slug) };
    const siblings = await listTranslations(page.id);
    siblings.filter((t) => t.status === 'published').forEach((t) => {
      languages[t.locale] = urlFor(t.locale, page.slug);
    });
  }

  return {
    title,
    description,
    robots: page.seo.noIndex ? { index: false, follow: false } : undefined,
    alternates: {
      canonical: page.seo.canonical || undefined,
      languages,
    },
    keywords: page.seo.keywords ? substituteText(page.seo.keywords, routeParams) : undefined,
    openGraph: {
      title,
      description,
      images: page.seo.ogImage ? [page.seo.ogImage] : undefined,
      locale: requestedLocale,
    },
  };
}

export default async function PublicPage({ params }) {
  const data = await resolve(params.slug);
  if (!data) notFound();

  const { page, params: routeParams, requestedLocale, enabledLocales } = data;
  const codes = enabledLocales.map((l) => l.code);

  // Links are localized against the URL namespace the visitor is actually
  // browsing (requestedLocale) rather than the content's own locale, so a
  // French-section page that's still falling back to English content keeps
  // its links inside /fr/... instead of silently dropping back to English.
  const header = page.header
    ? { ...page.header, props: localizeHrefs(page.header.props, requestedLocale, codes) }
    : null;
  const footer = page.footer
    ? { ...page.footer, props: localizeHrefs(page.footer.props, requestedLocale, codes) }
    : null;

  return (
    <>
      <Header data={header} locale={requestedLocale} enabledLocales={enabledLocales} />
      <main>{renderBlocks(page.blocks, routeParams, requestedLocale, codes)}</main>
      <Footer data={footer} />
    </>
  );
}
