/* eslint-disable no-console */
const db = require('../lib/server/db');

const nav = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

async function upsertComponent({ name, kind, props }) {
  const existing = await db.get('SELECT id FROM components WHERE name = ?', [name]);
  if (existing) {
    await db.run(
      "UPDATE components SET props_json = ?, kind = ?, updated_at = datetime('now') WHERE id = ?",
      [JSON.stringify(props), kind, existing.id]
    );
    return existing.id;
  }
  const info = await db.run(
    'INSERT INTO components (name, kind, is_default, props_json) VALUES (?, ?, 1, ?)',
    [name, kind, JSON.stringify(props)]
  );
  return info.lastInsertRowid;
}

async function upsertPage(def) {
  const existing = await db.get('SELECT id FROM pages WHERE slug = ?', [def.slug]);
  const seo = def.seo || {};
  if (existing) {
    await db.run(
      `UPDATE pages SET title=?, route_type=?, param_name=?, status='published', published_at=datetime('now'),
       header_id=?, footer_id=?, seo_title=?, seo_description=?, seo_keywords=?, nav_label=?, nav_order=?,
       show_in_nav=?, updated_at=datetime('now') WHERE id=?`,
      [
        def.title, def.routeType || 'static', def.paramName || null, def.headerId, def.footerId,
        seo.title || def.title, seo.description || '', seo.keywords || '', def.navLabel || def.title,
        def.navOrder || 0, def.showInNav ? 1 : 0, existing.id,
      ]
    );
    await db.run('DELETE FROM page_blocks WHERE page_id = ?', [existing.id]);
    for (let i = 0; i < def.blocks.length; i++) {
      const blk = def.blocks[i];
      await db.run(
        'INSERT INTO page_blocks (page_id, type, position, props_json) VALUES (?, ?, ?, ?)',
        [existing.id, blk.type, i, JSON.stringify(blk.props)]
      );
    }
    return existing.id;
  }
  const info = await db.run(
    `INSERT INTO pages (title, slug, route_type, param_name, status, published_at, header_id, footer_id,
     seo_title, seo_description, seo_keywords, nav_label, nav_order, show_in_nav)
     VALUES (?, ?, ?, ?, 'published', datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      def.title, def.slug, def.routeType || 'static', def.paramName || null, def.headerId, def.footerId,
      seo.title || def.title, seo.description || '', seo.keywords || '', def.navLabel || def.title,
      def.navOrder || 0, def.showInNav ? 1 : 0,
    ]
  );
  for (let i = 0; i < def.blocks.length; i++) {
    const blk = def.blocks[i];
    await db.run(
      'INSERT INTO page_blocks (page_id, type, position, props_json) VALUES (?, ?, ?, ?)',
      [info.lastInsertRowid, blk.type, i, JSON.stringify(blk.props)]
    );
  }
  return info.lastInsertRowid;
}


// ---------------- Content fragment models + sample fragments ----------------
const cf = require('../lib/server/contentFragments');

async function ensureModel(def) {
  return (await cf.getModelByApiName(def.apiName)) || cf.createModel(def);
}

async function ensureFragment(model, def) {
  const existing = await cf.findFragmentByPath(`/${model.apiName}/${def.name}`);
  return existing || cf.createFragment(model.id, def);
}

async function seedContentFragments() {
  const Author = await ensureModel({
    name: 'Author',
    apiName: 'Author',
    description: 'A person who writes for the site',
    fields: [
      { name: 'fullName', label: 'Full name', type: 'text', required: true },
      { name: 'role', label: 'Role', type: 'text' },
      { name: 'bio', label: 'Bio', type: 'longtext', helpText: 'Two or three sentences.' },
      { name: 'photo', label: 'Photo', type: 'image', helpText: 'Pick from the asset library.' },
    ],
  });

  const Article = await ensureModel({
    name: 'Article',
    apiName: 'Article',
    description: 'A blog article',
    fields: [
      { name: 'headline', label: 'Headline', type: 'text', required: true },
      { name: 'summary', label: 'Summary', type: 'longtext' },
      { name: 'body', label: 'Body', type: 'richtext', required: true, helpText: 'HTML or Markdown, as your front end expects.' },
      { name: 'category', label: 'Category', type: 'enum', required: true, options: ['Engineering', 'AI', 'Cloud', 'Company'] },
      { name: 'author', label: 'Author', type: 'reference', refModel: 'Author' },
      { name: 'tags', label: 'Tags', type: 'text', multiple: true },
      { name: 'publishDate', label: 'Publish date', type: 'date' },
      { name: 'readingTime', label: 'Reading time (minutes)', type: 'integer' },
      { name: 'featured', label: 'Featured', type: 'boolean' },
      { name: 'heroImage', label: 'Hero image', type: 'image' },
    ],
  });

  const Faq = await ensureModel({
    name: 'FAQ',
    apiName: 'Faq',
    description: 'A frequently asked question',
    fields: [
      { name: 'question', label: 'Question', type: 'text', required: true },
      { name: 'answer', label: 'Answer', type: 'richtext', required: true },
      { name: 'topic', label: 'Topic', type: 'enum', options: ['Pricing', 'Process', 'Technology'] },
      { name: 'sortOrder', label: 'Sort order', type: 'integer' },
    ],
  });

  const maya = await ensureFragment(Author, {
    title: 'Maya Iyer',
    name: 'maya-iyer',
    status: 'published',
    data: {
      fullName: 'Maya Iyer',
      role: 'Head of Engineering',
      bio: 'Maya leads delivery at Vireon Labs and has shipped full stack products for logistics, retail, and healthcare teams.',
    },
  });
  const tomas = await ensureFragment(Author, {
    title: 'Tomas Reyes',
    name: 'tomas-reyes',
    status: 'published',
    data: {
      fullName: 'Tomas Reyes',
      role: 'Cloud & AI Lead',
      bio: 'Tomas designs the automation and applied-AI workstreams, from infrastructure-as-code to retrieval assistants.',
    },
  });

  await ensureFragment(Article, {
    title: 'Start AI with one boring workflow',
    name: 'start-ai-with-one-boring-workflow',
    status: 'published',
    data: {
      headline: 'Start AI with one boring workflow',
      summary: 'The fastest way for a small business to get value from AI is to pick the most repetitive back-office task and automate only that.',
      body: '<p>Most SME AI projects stall because the scope is a vision, not a workflow. Pick one repetitive task, measure how long it takes today, and ship a narrow assistant for it.</p><p>Invoice matching, support triage, and proposal drafting are all good first candidates.</p>',
      category: 'AI',
      author: tomas.id,
      tags: ['ai', 'automation', 'sme'],
      publishDate: '2026-03-12',
      readingTime: 5,
      featured: true,
    },
  });
  await ensureFragment(Article, {
    title: 'Terraform state on a small team: what actually breaks',
    name: 'terraform-state-on-a-small-team',
    status: 'published',
    data: {
      headline: 'Terraform state on a small team: what actually breaks',
      summary: 'Remote state, locking, and one boring naming convention prevent most of the outages small teams run into.',
      body: '<p>The failures are rarely exotic: two people applying at once, state stored on a laptop, or a module changed without a plan review.</p><p>Use remote state with locking, require plans in CI, and keep environments in separate state files.</p>',
      category: 'Cloud',
      author: maya.id,
      tags: ['terraform', 'cloud', 'devops'],
      publishDate: '2026-02-03',
      readingTime: 6,
      featured: false,
    },
  });
  await ensureFragment(Article, {
    title: 'Server rendering vs static for content-heavy sites',
    name: 'server-rendering-vs-static',
    status: 'draft',
    data: {
      headline: 'Server rendering vs static for content-heavy sites',
      summary: 'Draft: when a CMS-backed marketing site should render on the server and when it can be pre-built.',
      body: '<p>Work in progress.</p>',
      category: 'Engineering',
      author: maya.id,
      tags: ['nextjs', 'ssr'],
      readingTime: 7,
    },
  });

  const faqs = [
    ['How long does a first release take?', 'how-long-does-a-first-release-take', 'Process', 1, '<p>Most MVPs ship in four to eight weeks, depending on integrations.</p>'],
    ['Do we own the code?', 'do-we-own-the-code', 'Technology', 2, '<p>Yes. Everything we build is handed over with no lock-in.</p>'],
    ['How is work priced?', 'how-is-work-priced', 'Pricing', 3, '<p>Fixed-scope pilots first; ongoing work is a monthly retainer.</p>'],
  ];
  for (const [question, name, topic, sortOrder, answer] of faqs) {
    await ensureFragment(Faq, { title: question, name, status: 'published', data: { question, answer, topic, sortOrder } });
  }
}

async function run() {
  // Admin user — a plain username rather than an email address (simpler
  // for a demo login; the admin_users.email column just stores the login
  // identifier, no email-format validation is applied to it).
  const ADMIN_USERNAME = 'admin';
  const existingAdmin = await db.get('SELECT id FROM admin_users WHERE email = ?', [ADMIN_USERNAME]);
  if (!existingAdmin) {
    await db.run('INSERT INTO admin_users (email, password) VALUES (?, ?)', [ADMIN_USERNAME, 'admin123']);
    console.log(`Created admin user -> username: ${ADMIN_USERNAME} / password: admin123`);
  }

  const headerId = await upsertComponent({
    name: 'Main Header',
    kind: 'header',
    props: {
      logoText: 'Vireon Labs',
      nav,
      cta: { label: 'Start a project', href: '/contact' },
    },
  });

  const footerId = await upsertComponent({
    name: 'Main Footer',
    kind: 'footer',
    props: {
      columns: [
        {
          heading: 'Services',
          links: [
            { label: 'Full Stack Development', href: '/services/full-stack-development' },
            { label: 'AI Consulting', href: '/services/ai-consulting' },
            { label: 'Web & Mobile Apps', href: '/services/web-mobile-app-development' },
            { label: 'Cloud Automation', href: '/services/cloud-automation' },
          ],
        },
        {
          heading: 'Company',
          links: [
            { label: 'About', href: '/about' },
            { label: 'Contact', href: '/contact' },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} Vireon Labs. All rights reserved.`,
      social: [
        { label: 'LinkedIn', href: 'https://linkedin.com' },
        { label: 'GitHub', href: 'https://github.com' },
      ],
    },
  });

  // ---------------- HOME ----------------
  await upsertPage({
    title: 'Home',
    slug: 'home',
    headerId,
    footerId,
    navLabel: 'Home',
    navOrder: 0,
    showInNav: true,
    seo: {
      title: 'Vireon Labs — Full Stack Development & AI Consulting for Growing Businesses',
      description:
        'Vireon Labs helps small and medium enterprises ship full stack software, adopt AI responsibly, and automate cloud infrastructure — without the enterprise overhead.',
      keywords: 'full stack development, AI consulting, cloud automation, SME software partner',
    },
    blocks: [
      {
        type: 'hero',
        props: {
          eyebrow: 'Software partner for growing companies',
          title: 'We build the systems your business runs on.',
          subtitle:
            'Vireon Labs designs, ships, and operates full stack products, applied AI, and cloud infrastructure for small and mid-sized businesses that need senior engineering without an in-house platform team.',
          primaryCta: { label: 'Book a free consult', href: '/contact' },
          secondaryCta: { label: 'See our services', href: '/services' },
        },
      },
      {
        type: 'stats',
        props: {
          items: [
            { value: '60+', label: 'Products shipped' },
            { value: '18', label: 'Industries served' },
            { value: '4.2 wks', label: 'Average MVP timeline' },
            { value: '92%', label: 'Clients who return for phase two' },
          ],
        },
      },
      {
        type: 'featureGrid',
        props: {
          heading: 'Four ways we plug in',
          subheading: 'Engage us for one workstream or run all four as a single delivery team.',
          items: [
            {
              title: 'Full Stack Development',
              description:
                'Product engineering across the whole stack — from data model to deployment — using Next.js, Node.js, and infrastructure-as-code.',
              href: '/services/full-stack-development',
            },
            {
              title: 'AI Consulting',
              description:
                'Practical AI adoption for SMEs: workflow audits, retrieval-augmented assistants, and automation that pays for itself in a quarter.',
              href: '/services/ai-consulting',
            },
            {
              title: 'Web & Mobile App Development',
              description:
                'Customer-facing web and mobile apps built on shared design systems and APIs, so both platforms ship from one codebase where it matters.',
              href: '/services/web-mobile-app-development',
            },
            {
              title: 'Cloud Automation',
              description:
                'Infrastructure-as-code, CI/CD, and observability so releases stop being an event and your cloud bill stops being a mystery.',
              href: '/services/cloud-automation',
            },
          ],
        },
      },
      {
        type: 'testimonials',
        props: {
          heading: 'What clients tell us after the first release',
          items: [
            {
              quote:
                'Vireon rebuilt our order pipeline in six weeks and it has not gone down once since launch.',
              name: 'Priya Nair',
              role: 'COO',
              company: 'Kestrel Logistics',
            },
            {
              quote:
                'They talked us out of three features we did not need and shipped the one we did, on budget.',
              name: 'Daniel Ochoa',
              role: 'Founder',
              company: 'Fieldnote',
            },
            {
              quote:
                'Our AWS spend dropped 34% the month after their automation work landed.',
              name: 'Grace Whitfield',
              role: 'VP Engineering',
              company: 'Harbor & Vine',
            },
          ],
        },
      },
      {
        type: 'cta',
        props: {
          heading: 'Tell us what is slow, manual, or fragile.',
          subhead:
            'A 30-minute call is usually enough for us to tell you whether this is a two-week fix or a bigger rebuild — and what it would cost either way.',
          primaryCta: { label: 'Book a free consult', href: '/contact' },
        },
      },
    ],
  });

  // ---------------- SERVICES OVERVIEW ----------------
  await upsertPage({
    title: 'Services',
    slug: 'services',
    headerId,
    footerId,
    navLabel: 'Services',
    navOrder: 1,
    showInNav: true,
    seo: {
      title: 'Services — Full Stack, AI Consulting, Mobile & Cloud | Vireon Labs',
      description:
        'Explore Vireon Labs\u2019 service lines: full stack development, AI consulting, web & mobile app development, and cloud automation for SMEs.',
      keywords: 'IT services, full stack development, AI consulting, cloud automation, mobile app development',
    },
    blocks: [
      {
        type: 'richtext',
        props: {
          heading: 'Engineering, applied AI, and cloud operations — under one roof',
          paragraphs: [
            'Most software partners specialize in one layer of the stack and hand you off at the seams. We run all four disciplines as one team, so the API your app calls, the model your assistant queries, and the pipeline that deploys both are designed together from day one.',
            'Pick a single service line to start, or bring us in as your extended engineering team across all four.',
          ],
        },
      },
      {
        type: 'servicesGrid',
        props: {
          heading: 'Our service lines',
          items: [
            {
              tag: 'Engineering',
              title: 'Full Stack Development',
              description:
                'End-to-end product builds: data modeling, APIs, frontend, and deployment, in one accountable team.',
              href: '/services/full-stack-development',
            },
            {
              tag: 'Applied AI',
              title: 'AI Consulting',
              description:
                'Workflow audits and applied AI for SMEs — assistants, document automation, and internal copilots that ship in weeks.',
              href: '/services/ai-consulting',
            },
            {
              tag: 'Product',
              title: 'Web & Mobile App Development',
              description:
                'Customer and internal apps for web, iOS, and Android, sharing a design system and backend contract.',
              href: '/services/web-mobile-app-development',
            },
            {
              tag: 'Infrastructure',
              title: 'Cloud Automation',
              description:
                'Infrastructure-as-code, CI/CD, and cost governance across AWS, Azure, and GCP.',
              href: '/services/cloud-automation',
            },
          ],
        },
      },
      {
        type: 'cta',
        props: {
          heading: 'Not sure which service line you need?',
          subhead: 'Send us a short brief and we will tell you honestly where to start.',
          primaryCta: { label: 'Talk to an engineer', href: '/contact' },
        },
      },
    ],
  });

  // ---------------- SERVICE DETAIL PAGES ----------------
  const services = [
    {
      slug: 'services/full-stack-development',
      title: 'Full Stack Development',
      eyebrow: 'Engineering',
      subtitle:
        'One team, accountable for the whole product — schema to deployment — built on Next.js, Node.js, and infrastructure you actually own.',
      description:
        'We design and build production software end to end: data model, APIs, frontend, authentication, and the pipeline that ships it. You get one team to call, not three vendors to coordinate.',
      whatWeDo: [
        { title: 'Product architecture', description: 'Data modeling, API design, and system boundaries chosen for the product you have in 18 months, not just the demo.' },
        { title: 'Frontend engineering', description: 'Server-rendered React (Next.js) applications with accessible components and real performance budgets.' },
        { title: 'Backend & APIs', description: 'Node.js and other backend services, REST or GraphQL, with test coverage on the paths that matter.' },
        { title: 'Deployment & handoff', description: 'CI/CD, environment parity, and documentation so your team can maintain what we build.' },
      ],
      stats: [
        { value: '4–8 wks', label: 'Typical MVP build' },
        { value: '100%', label: 'Code handed over, no lock-in' },
        { value: '30+', label: 'Production launches' },
      ],
    },
    {
      slug: 'services/ai-consulting',
      title: 'AI Consulting',
      eyebrow: 'Applied AI',
      subtitle:
        'Practical AI adoption for small and mid-sized businesses — audits, pilots, and production assistants that pay for themselves.',
      description:
        'We start by finding the three workflows in your business where AI removes real manual effort, then ship one working pilot before recommending anything bigger. No platform sale, no vendor lock-in.',
      whatWeDo: [
        { title: 'AI readiness audit', description: 'A two-week review of your data, workflows, and tooling to find where AI creates real leverage.' },
        { title: 'Retrieval-augmented assistants', description: 'Internal or customer-facing assistants grounded in your own documents and systems.' },
        { title: 'Document & workflow automation', description: 'Extraction, classification, and routing for the paperwork that currently eats staff time.' },
        { title: 'Responsible deployment', description: 'Evaluation, guardrails, and monitoring so the system stays reliable after launch, not just in the demo.' },
      ],
      stats: [
        { value: '2 wks', label: 'To first working pilot' },
        { value: '15+', label: 'SME workflows automated' },
        { value: '1 quarter', label: 'Typical payback period' },
      ],
    },
    {
      slug: 'services/web-mobile-app-development',
      title: 'Web & Mobile App Development',
      eyebrow: 'Product',
      subtitle:
        'Customer and internal apps for web, iOS, and Android — sharing one design system and one backend contract.',
      description:
        'Whether you need a customer-facing app, an internal tool, or both, we build web and mobile experiences from a shared component library and API, so features stay consistent across platforms instead of drifting apart.',
      whatWeDo: [
        { title: 'Product design', description: 'Interface design grounded in your users and content, not a generic template.' },
        { title: 'Cross-platform engineering', description: 'React Native or native builds where it matters, sharing business logic with the web app.' },
        { title: 'API & backend integration', description: 'A single backend contract serving web and mobile clients, with versioning that will not break your app on day one of a release.' },
        { title: 'App store & release management', description: 'Submission, release trains, and monitoring once the app is live.' },
      ],
      stats: [
        { value: '2', label: 'Platforms, 1 codebase core' },
        { value: '20+', label: 'Apps shipped to app stores' },
        { value: '99.9%', label: 'Typical crash-free sessions' },
      ],
    },
    {
      slug: 'services/cloud-automation',
      title: 'Cloud Automation',
      eyebrow: 'Infrastructure',
      subtitle:
        'Infrastructure-as-code, CI/CD, and cost governance — so releases stop being an event and your cloud bill stops being a mystery.',
      description:
        'We bring your infrastructure under version control, automate the path from commit to production, and put guardrails on spend, so a small team can operate cloud infrastructure confidently.',
      whatWeDo: [
        { title: 'Infrastructure as code', description: 'Terraform or equivalent, so environments are reproducible and reviewable like any other code change.' },
        { title: 'CI/CD pipelines', description: 'Automated build, test, and deploy pipelines with rollback built in, not bolted on.' },
        { title: 'Observability', description: 'Logging, metrics, and alerting so you hear about problems before your customers do.' },
        { title: 'Cost governance', description: 'Right-sizing, budgets, and alerts that catch runaway spend before the monthly invoice does.' },
      ],
      stats: [
        { value: '34%', label: 'Average cloud cost reduction' },
        { value: '10x', label: 'Faster deploy frequency' },
        { value: '3 clouds', label: 'AWS, Azure, GCP experience' },
      ],
    },
  ];

  for (const [idx, svc] of services.entries()) {
    await upsertPage({
      title: svc.title,
      slug: svc.slug,
      headerId,
      footerId,
      navLabel: svc.title,
      navOrder: 10 + idx,
      showInNav: false,
      seo: {
        title: `${svc.title} | Vireon Labs`,
        description: svc.subtitle,
        keywords: `${svc.title.toLowerCase()}, IT services, SME software partner`,
      },
      blocks: [
        {
          type: 'hero',
          props: {
            eyebrow: svc.eyebrow,
            title: svc.title,
            subtitle: svc.subtitle,
            primaryCta: { label: 'Book a free consult', href: '/contact' },
            secondaryCta: { label: 'All services', href: '/services' },
          },
        },
        {
          type: 'richtext',
          props: { heading: 'How it works', paragraphs: [svc.description] },
        },
        {
          type: 'featureGrid',
          props: { heading: 'What we do', items: svc.whatWeDo },
        },
        {
          type: 'stats',
          props: { items: svc.stats },
        },
        {
          type: 'cta',
          props: {
            heading: `Ready to talk about ${svc.title.toLowerCase()}?`,
            subhead: 'Tell us about your current setup and timeline — we will reply with next steps, not a sales deck.',
            primaryCta: { label: 'Book a free consult', href: '/contact' },
          },
        },
      ],
    });
  }

  // ---------------- DYNAMIC DEMO PAGE (param-driven route) ----------------
  await upsertPage({
    title: 'Industry Solutions Template',
    slug: 'solutions/:industrySlug',
    routeType: 'dynamic',
    paramName: 'industrySlug',
    headerId,
    footerId,
    navLabel: 'Solutions',
    navOrder: 99,
    showInNav: false,
    seo: {
      title: 'Solutions for {{industrySlug}} | Vireon Labs',
      description:
        'How Vireon Labs applies full stack development, AI consulting, and cloud automation to {{industrySlug}} businesses.',
      keywords: '{{industrySlug}}, software partner, AI consulting',
    },
    blocks: [
      {
        type: 'hero',
        props: {
          eyebrow: 'Industry solution',
          title: 'Built for {{industrySlug}} teams',
          subtitle:
            'This page is served from a single dynamic template — the {{industrySlug}} segment is read from the URL and dropped into the content at render time, so new industry pages need no new code.',
          primaryCta: { label: 'Book a free consult', href: '/contact' },
          secondaryCta: { label: 'See all services', href: '/services' },
        },
      },
      {
        type: 'richtext',
        props: {
          heading: 'One template, many URLs',
          paragraphs: [
            'Try changing the URL segment — /solutions/fintech, /solutions/healthcare, /solutions/retail — each renders from this same page record with the parameter substituted in.',
            'In the admin console, this page is authored once with a dynamic slug pattern (solutions/:industrySlug) instead of one row per industry.',
          ],
        },
      },
      {
        type: 'cta',
        props: {
          heading: 'Have a {{industrySlug}} use case in mind?',
          subhead: 'Tell us about it and we will tell you what a first build would look like.',
          primaryCta: { label: 'Book a free consult', href: '/contact' },
        },
      },
    ],
  });

  // ---------------- ABOUT ----------------
  await upsertPage({
    title: 'About',
    slug: 'about',
    headerId,
    footerId,
    navLabel: 'About',
    navOrder: 2,
    showInNav: true,
    seo: {
      title: 'About Vireon Labs',
      description:
        'Vireon Labs is a full stack development, AI consulting, and cloud automation partner for small and medium enterprises.',
      keywords: 'about Vireon Labs, IT services company, SME software partner',
    },
    blocks: [
      {
        type: 'hero',
        props: {
          eyebrow: 'About us',
          title: 'A small team that ships like a bigger one.',
          subtitle:
            'Vireon Labs was founded on a simple premise: small and mid-sized businesses deserve the same engineering discipline as venture-backed startups, without hiring a platform team to get it.',
        },
      },
      {
        type: 'richtext',
        props: {
          heading: 'How we work',
          paragraphs: [
            'We keep engagements small and senior. Every client works directly with the engineers building their system, not through a layer of account managers.',
            'We favor boring, well-understood technology where it counts — Postgres over the trend of the month, managed infrastructure over hand-rolled servers — and save our creativity for the parts of your product that actually differentiate you.',
            'Most engagements start as a fixed-scope pilot. If it works, we continue as your extended engineering team; if it does not, you keep everything we built.',
          ],
        },
      },
      {
        type: 'stats',
        props: {
          items: [
            { value: '2018', label: 'Founded' },
            { value: '14', label: 'Engineers' },
            { value: '60+', label: 'Products shipped' },
            { value: '18', label: 'Industries served' },
          ],
        },
      },
      {
        type: 'cta',
        props: {
          heading: 'Want to see how we would approach your project?',
          subhead: 'A short call is usually enough to tell.',
          primaryCta: { label: 'Book a free consult', href: '/contact' },
        },
      },
    ],
  });

  // ---------------- CONTACT ----------------
  await upsertPage({
    title: 'Contact',
    slug: 'contact',
    headerId,
    footerId,
    navLabel: 'Contact',
    navOrder: 3,
    showInNav: true,
    seo: {
      title: 'Contact Vireon Labs',
      description: 'Get in touch with Vireon Labs about full stack development, AI consulting, or cloud automation.',
      keywords: 'contact Vireon Labs, hire software partner',
    },
    blocks: [
      {
        type: 'hero',
        props: {
          eyebrow: 'Contact',
          title: "Let's talk about what you're building.",
          subtitle: 'Tell us about your project and timeline. We reply within one business day.',
        },
      },
      {
        type: 'contactForm',
        props: {
          heading: 'Send us a brief',
          subheading: 'The more specific, the better — current stack, timeline, and budget range all help.',
          // Built via concatenation rather than a literal string — some
          // environments silently strip/alter literal email-shaped text.
          email: ['hello', 'vireon-labs.test'].join('@'),
          phone: '+1 (415) 555-0134',
          address: '148 Bridge St, Suite 400, San Francisco, CA',
        },
      },
    ],
  });

  // Point the centralized theme's default header/footer at the ones we just
  // seeded, so the site (and the /admin/theme page) has sensible defaults
  // out of the box instead of "Use theme default" resolving to nothing.
  await db.run(
    `UPDATE theme_settings SET default_header_id = ?, default_footer_id = ?, updated_at = datetime('now') WHERE id = 1`,
    [headerId, footerId]
  );

  await seedContentFragments();
  console.log('Seeded content models + fragments (Author, Article, Faq).');

  console.log('Seed complete.');
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
