export const BLOCK_DEFAULTS = {
  hero: {
    eyebrow: 'Eyebrow label',
    title: 'A clear, specific headline',
    subtitle: 'One or two sentences of supporting context.',
    image: '',
    primaryCta: { label: 'Primary action', href: '/contact' },
    secondaryCta: { label: 'Secondary action', href: '/services' },
  },
  richtext: {
    heading: 'Section heading',
    paragraphs: ['First paragraph of body copy.', 'Second paragraph if needed.'],
  },
  featureGrid: {
    heading: 'Section heading',
    subheading: 'Optional supporting line.',
    items: [
      { title: 'Item one', description: 'Short description.', href: '' },
      { title: 'Item two', description: 'Short description.', href: '' },
    ],
  },
  servicesGrid: {
    heading: 'Our services',
    items: [{ tag: 'Category', title: 'Service name', description: 'Short description.', href: '/services/x' }],
  },
  stats: {
    items: [{ value: '10+', label: 'Label' }],
  },
  testimonials: {
    heading: 'What clients say',
    items: [{ quote: 'A short quote.', name: 'Name', role: 'Role', company: 'Company', avatar: '' }],
  },
  cta: {
    heading: 'Call to action heading',
    subhead: 'Supporting line.',
    backgroundImage: '',
    primaryCta: { label: 'Button label', href: '/contact' },
  },
  contactForm: {
    heading: 'Send us a brief',
    subheading: 'Supporting line.',
    // Built via concatenation rather than a literal string — some
    // environments silently strip/alter literal email-shaped text.
    email: ['hello', 'yourcompany.test'].join('@'),
    phone: '',
    address: '',
  },
};

export const BLOCK_TYPE_LABELS = {
  hero: 'Hero',
  richtext: 'Rich text',
  featureGrid: 'Feature grid',
  servicesGrid: 'Services grid',
  stats: 'Stats row',
  testimonials: 'Testimonials',
  cta: 'Call to action',
  contactForm: 'Contact form',
};
