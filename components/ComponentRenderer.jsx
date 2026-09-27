import Hero from './blocks/Hero';
import RichText from './blocks/RichText';
import FeatureGrid from './blocks/FeatureGrid';
import ServicesGrid from './blocks/ServicesGrid';
import Stats from './blocks/Stats';
import Testimonials from './blocks/Testimonials';
import CTA from './blocks/CTA';
import ContactForm from './blocks/ContactForm';

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

export function renderBlocks(blocks = [], params = {}) {
  return blocks.map((block) => {
    const Component = REGISTRY[block.type];
    if (!Component) {
      if (process.env.NODE_ENV !== 'production') {
        return (
          <div key={block.id} className="max-w-content mx-auto px-6 py-6 text-sm text-red-600">
            Unknown block type: {block.type}
          </div>
        );
      }
      return null;
    }
    const props = substitute(block.props, params);
    return <Component key={block.id} {...props} />;
  });
}

export function substituteText(value, params) {
  return substitute(value, params);
}

export const BLOCK_TYPES = Object.keys(REGISTRY);
