import Hero from './blocks/Hero';
import RichText from './blocks/RichText';
import FeatureGrid from './blocks/FeatureGrid';
import ServicesGrid from './blocks/ServicesGrid';
import Stats from './blocks/Stats';
import Testimonials from './blocks/Testimonials';
import CTA from './blocks/CTA';
import ContactForm from './blocks/ContactForm';
import { DEFAULT_LOCALE } from '../lib/localeCatalog';

const REGISTRY = {
  hero: Hero,
  richtext: RichText,
  featureGrid: FeatureGrid,
  servicesGrid: ServicesGrid,
  stats: Stats,
  testimonials: Testimonials,
  cta: CTA,
  contactForm: ContactForm,
};

// Recursively substitutes {{paramName}} tokens in any string field of a
// block's props with the resolved dynamic-route param value. This is what
// lets one page record (e.g. slug "solutions/:industrySlug") serve
// unlimited URLs with param-driven content.
function substitute(value, params) {
  if (!params || Object.keys(params).length === 0) return value;
  if (typeof value === 'string') {
    return value.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const raw = params[key];
      if (!raw) return _;
      return raw
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    });
  }
  if (Array.isArray(value)) return value.map((v) => substitute(v, params));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, substitute(v, params)]));
  }
  return value;
}

// Every internal link field across every block, header, and footer schema
// is named exactly "href" — nothing else is, so rewriting every "href" key
// found anywhere in a props tree is both simple and precise. External URLs
// (https://…), protocol-relative (//…), and non-path values (mailto:, tel:,
// empty) are left untouched; a path already prefixed with an enabled
// locale code is left alone too, so this is safe to apply more than once.
export function localizeHref(href, locale, enabledCodes = []) {
  if (typeof href !== 'string' || !href.startsWith('/') || href.startsWith('//')) return href;
  if (!locale || locale === DEFAULT_LOCALE) return href;
  const firstSegment = href.split('/')[1] || '';
  if (enabledCodes.includes(firstSegment)) return href;
  return href === '/' ? `/${locale}` : `/${locale}${href}`;
}

export function localizeHrefs(value, locale, enabledCodes = []) {
  if (Array.isArray(value)) return value.map((v) => localizeHrefs(v, locale, enabledCodes));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        k === 'href' ? localizeHref(v, locale, enabledCodes) : localizeHrefs(v, locale, enabledCodes),
      ])
    );
  }
  return value;
}

export function renderBlocks(blocks = [], params = {}, locale = DEFAULT_LOCALE, enabledCodes = []) {
  return blocks.map((block) => {
    const Component = REGISTRY[block.type];
    if (!Component) {
      if (process.env.NODE_ENV !== 'production') {
        return (
          <div key={block.id} className="block-unknown">
            Unknown block type: {block.type}
          </div>
        );
      }
      return null;
    }
    const props = localizeHrefs(substitute(block.props, params), locale, enabledCodes);
    return <Component key={block.id} {...props} />;
  });
}

export function substituteText(value, params) {
  return substitute(value, params);
}

export const BLOCK_TYPES = Object.keys(REGISTRY);
