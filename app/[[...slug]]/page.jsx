import { notFound } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { renderBlocks, substituteText } from '../../components/ComponentRenderer';
import { resolvePublicPage } from '../../lib/server/pages';

async function resolve(slugParts) {
  try {
    return await resolvePublicPage(slugParts || []);
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

export async function generateMetadata({ params }) {
  const data = await resolve(params.slug);
  if (!data) return {};
  const { page, params: routeParams } = data;
  const title = substituteText(page.seo.title || page.title, routeParams);
  const description = substituteText(page.seo.description || '', routeParams);
  return {
    title,
    description,
    robots: page.seo.noIndex ? { index: false, follow: false } : undefined,
    alternates: page.seo.canonical ? { canonical: page.seo.canonical } : undefined,
    keywords: page.seo.keywords ? substituteText(page.seo.keywords, routeParams) : undefined,
    openGraph: {
      title,
      description,
      images: page.seo.ogImage ? [page.seo.ogImage] : undefined,
    },
  };
}

export default async function PublicPage({ params }) {
  const data = await resolve(params.slug);
  if (!data) notFound();

  const { page, params: routeParams } = data;

  return (
    <>
      <Header data={page.header} />
      <main>{renderBlocks(page.blocks, routeParams)}</main>
      <Footer data={page.footer} />
    </>
  );
}
