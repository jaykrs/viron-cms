# Vireon Labs — combined Website Builder / CMS (single Next.js project)

One Next.js 14 (App Router) project containing both the public SSR site and
the backend: no separate Express service, no separate `npm install`, one
`.env`, one dev server.

- **Frontend**: Next.js 14, server-rendered, Tailwind CSS
- **Backend**: Next.js Route Handlers (`app/api/**`) — plain Node.js, same
  process as the frontend
- **Database**: [libSQL](https://turso.tech/libsql) via `@libsql/client` —
  a local file by default, or [Turso](https://turso.tech) in production,
  with **no code changes** between the two (see "Database", below)
- **Caching**: Redis via `ioredis`, with an automatic in-memory fallback if
  no Redis server is reachable
- **Auth**: JWT-based admin login (`jsonwebtoken`)

Seeded with a dummy IT services company, **Vireon Labs**, covering Full
Stack Development, AI Consulting, Web & Mobile App Development, and Cloud
Automation.

## Why one project instead of two services

Public pages render by calling the data-access functions in
`lib/server/pages.js` **directly** from the Server Component
(`app/[[...slug]]/page.jsx`) — no internal HTTP round-trip. The same
functions are reused by the `app/api/pages/**` Route Handlers, which is what
the admin console's client-side JavaScript calls (it has to — the admin UI
runs in the browser, so it needs real HTTP endpoints with `Authorization`
headers). One codebase, one source of truth for the data logic, two ways of
reaching it depending on whether the caller is server-side render or
browser-side fetch.

## Project layout

```
app/
  [[...slug]]/page.jsx     public catch-all route — resolves any page
                           (static or dynamic), generates SEO metadata,
                           calls lib/server/pages.js directly (no fetch)
  sitemap.js               machine-readable /sitemap.xml
  sitemap/page.jsx         human-readable /sitemap page
  api/
    auth/login/route.js
    auth/password/route.js            change password (logged-in user)
    pages/route.js                    list (admin) / create
    pages/[id]/route.js               get / update / delete
    pages/[id]/publish/route.js
    pages/[id]/unpublish/route.js
    pages/public/nav/route.js         (for any external/headless caller)
    pages/public/resolve/route.js     (for any external/headless caller)
    components/route.js               header/footer library: list / create
    components/[id]/route.js          get / update / delete
    theme/route.js                    site theme: get (public) / update (auth)
    assets/route.js                   image library: list (auth) / upload (auth)
    assets/[id]/route.js              delete (auth)
    visitors/route.js                 cookie-consent capture (public POST) /
                                       admin list (auth GET)
    visitors/track/route.js           page-view tracking (public, no-ops
                                       silently for an unknown visitor)
    visitors/[id]/route.js            visitor journey (auth) / delete (auth)
    export/route.js                   full site content bundle (auth)
    import/route.js                   restore/merge a bundle (auth)
  admin/                   admin console (pages list, editor, header/footer
                           library, assets, theme, visitors, export/import,
                           settings) — client components calling /api/*
lib/
  server/
    db.js         libSQL schema + connection (local file or Turso)
    cache.js       Redis-or-memory cache abstraction
    auth.js         JWT sign/verify + change-password
    pages.js        page CRUD, block authoring, publish, public resolver,
                    sitemap queries, export/import helpers
    components.js   header/footer component CRUD
    theme.js        site theme (colors + default header/footer)
    assets.js       image upload/list/delete (disk + DB record)
    visitors.js     cookie-consent capture + page-view analytics ("journey")
    exportImport.js assembles/restores the full site content bundle
    errors.js       shared ApiError class
    routeHelpers.js shared error handling + auth guard for route handlers
  api.js          browser-side fetch client used by the admin console
                  (relative /api/* paths — same origin now)
components/
  Header.jsx, Footer.jsx, ComponentRenderer.jsx (block registry + {{param}}
  substitution), CookieConsent.jsx (accept/reject banner + tracking),
  blocks/ (8 content block components, several with image support: Hero,
  CTA, FeatureGrid, Testimonials), admin/ (block editor, asset picker modal)
scripts/
  seed.js         seeds the Vireon Labs demo content, admin user, and theme
                  defaults
db/
  cms.db          local libSQL database file (created by the seed script;
                  unused if TURSO_DATABASE_URL points at a real Turso db)
public/
  uploads/        uploaded images land here, served as normal static files
```

## How the CMS concepts map to code

- **Pages with a static slug or a dynamic URL param**: a page's
  `route_type` is `static` (slug `about`) or `dynamic` (slug pattern
  `solutions/:industrySlug`). `resolvePublicPage()` in `lib/server/pages.js`
  matches the requested path against static slugs first, then dynamic
  patterns, extracting the param. Try `/solutions/fintech`,
  `/solutions/healthcare` — one page record serves unlimited URLs, with
  `{{industrySlug}}` tokens in any block's text substituted at render time.
- **Component authoring (header/footer per page)**: headers/footers are
  reusable `components` (kind `header` / `footer`) with JSON props, editable
  at `/admin/components`. Each page picks one of each — or leaves it as
  "Use theme default" to inherit the site-wide default (see Theme, below).
- **Page authoring**: each page has an ordered list of content blocks,
  authored in the admin editor as JSON props with add / reorder / remove.
  8 block types are registered (hero, rich text, feature grid, services
  grid, stats, testimonials, CTA, contact form) — add more in
  `components/ComponentRenderer.jsx` + `components/blocks/`.
- **Images in components**: every block's editor has an "Insert image"
  button that opens the asset library and drops the picked image's URL at
  the cursor. Hero, CTA, feature grid items, and testimonials all render an
  image/avatar when one is present in their props — see "Assets" below for
  how uploads work.
- **SEO & dynamic metadata**: meta title/description/keywords/canonical/OG
  image/noindex per page, rendered via Next.js `generateMetadata`, with
  `{{param}}` substitution for dynamic pages.
- **Draft / publish**: pages are `draft` until explicitly published; only
  published pages are resolvable on the public site.
- **Caching**: the public nav and resolved-page-by-path lookups are cached
  (60–120s TTL) behind an abstraction that prefers Redis and transparently
  falls back to an in-memory cache.

### Database (libSQL / Turso)

`lib/server/db.js` connects with `@libsql/client`, which speaks the same
protocol whether the target is a local file or a real Turso database:

- **Local (default)** — no env vars needed. Connects to a local libSQL file
  at `db/cms.db`, created automatically on first run.
- **Turso** — set two env vars and nothing else changes:
  ```bash
  TURSO_DATABASE_URL=libsql://your-db-name-your-org.turso.io
  TURSO_AUTH_TOKEN=eyJhbGciOi...
  ```
  Get both from the [Turso CLI](https://docs.turso.tech/cli/installation):
  `turso db create vireon-cms`, then `turso db show vireon-cms --url` and
  `turso db tokens create vireon-cms`.

The rest of the codebase talks to the database through small async helpers
(`db.get`, `db.all`, `db.run`, `db.batch`) rather than raw SQL client calls,
so every query function in `lib/server/*.js` is `async`/`await` — this is
what makes the same code work identically against a local file or a remote
Turso database over HTTP.

### Cookie consent, email capture & visitor analytics

A cookie banner (`components/CookieConsent.jsx`) renders on every public
page (not `/admin`):

- **Reject** — sets a "rejected" cookie and nothing else. No data is sent
  to the server, no visitor row is created.
- **Accept** — reveals a one-field email form. Submitting it generates a
  random visitor id (stored in a first-party cookie), POSTs the id + email
  to `/api/visitors`, and marks consent as accepted. From then on, every
  page the visitor loads is logged via `/api/visitors/track` (silently a
  no-op if the visitor id isn't recognized — e.g. cookies were cleared).

`/admin/visitors` lists everyone who accepted (email, first/last seen, page
view count); clicking through to `/admin/visitors/[id]` shows their full
**journey** — an ordered timeline of every page they visited, with
timestamps and referrers. A **Delete** action removes a visitor and their
page-view history entirely (e.g. for an erasure request).

> This ships as a working demo of the mechanism, not legal advice. If you
> deploy this somewhere with real visitors, make sure the banner's copy,
> your data retention, and this feature as a whole actually comply with
> whatever privacy law applies to you (GDPR, CCPA, etc.) — that's a product
> and legal decision, not something a default implementation can cover.

### Assets (image upload)

`/admin/assets` uploads images to `public/uploads/` (served as normal
static files) and records them in the `assets` table. `POST /api/assets`
accepts a `multipart/form-data` body with a `file` field (PNG/JPEG/WebP/
GIF/SVG, 8MB max) via Next's native `request.formData()` — no extra upload
library needed. The same library is reachable from inside any block's
editor via the "Insert image" button (`components/admin/AssetPicker.jsx`),
so an image can be attached to a Hero, a testimonial avatar, a CTA
background, etc. without leaving the page editor.

### Theme (centralized primary/secondary color + default layout)

`/admin/theme` (admin-only) sets:
- **Primary / secondary color** — stored as hex values in `theme_settings`
  and injected as CSS custom properties (`--color-primary`,
  `--color-secondary`) on `<html>` in `app/layout.js`, read directly from
  the database server-side (no HTTP round-trip, no flash of default
  colors). `tailwind.config.js` maps its `signal` and `amber` color tokens
  to those variables, so every existing `bg-signal` / `text-amber` / etc.
  class across every component picks up the new color automatically —
  changing the theme re-colors the entire site with no per-component edits.
- **Default header / default footer** — used by any page that doesn't
  explicitly assign its own (`resolvePublicPage()` and `getPageById()` in
  `lib/server/pages.js` fall back to the theme's defaults). This is what
  makes a header/footer choice apply across every page from one central
  place, while still letting an individual page override it.

### Account settings

`/admin/settings` lets the logged-in admin change their password
(`PUT /api/auth/password`, verified against the current password before
accepting a new one — demo-grade plaintext comparison, see the production
notes below).

### Sitemap

- `/sitemap.xml` — machine-readable, auto-generated by the Next.js
  `app/sitemap.js` convention from all published static pages. Set
  `SITE_URL` in `.env.local` to your real domain before deploying.
- `/sitemap` — a human-readable page listing every published page (dynamic
  template pages are listed by name but not linked, since their real URLs
  aren't enumerable), rendered with the site's normal header/footer.

### Export & import

`/admin/export-import` downloads or restores a **complete content bundle**:
every page (with its blocks and SEO), the header/footer component library,
and the theme — as one JSON file (`lib/server/exportImport.js`).

- **Export** references components by *name*, not numeric id, so a bundle
  exported from one database imports cleanly into a different one (e.g.
  moving from the local file database to Turso, or between two separate
  Turso databases) without id collisions.
- **Import upserts**: pages are matched by slug, components by name.
  Anything matching is updated in place (its blocks are fully replaced);
  anything new is created. Nothing outside the bundle is ever deleted, so
  re-running the same import twice is safe, and importing a partial bundle
  (e.g. just one page) won't touch the rest of the site.
- Visitor/analytics data is deliberately **excluded** from every export —
  this is a content-migration tool, not a data-export tool, and visitor
  emails shouldn't travel between environments just because a page did.

## Running it

Requires Node.js 18+.

```bash
npm install
npm run seed     # creates db/cms.db and seeds the Vireon Labs content
npm run dev      # http://localhost:3000
```

Admin login created by the seed script: **admin / admin123**

Optional env vars (`.env.local`):
- `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` — use a real Turso database
  instead of the local file (see "Database", above).
- `REDIS_URL` — use a real Redis instance instead of the in-memory cache
  fallback.
- `SITE_URL` — base URL used when generating `/sitemap.xml`.

### Use it

- Public site: `http://localhost:3000`
- Admin console: `http://localhost:3000/admin`
- Dynamic route demo: `http://localhost:3000/solutions/<anything>`

### Production build

```bash
npm run build
npm start
```

**Note on fonts**: this project loads Space Grotesk, IBM Plex Sans, and IBM
Plex Mono via `next/font/google` in `app/layout.js`. That requires network
access to `fonts.googleapis.com` / `fonts.gstatic.com` at build time (dev
mode tolerates the fetch failing and falls back to a system font
automatically; `next build` does not). If you're building somewhere without
that access (an offline CI runner, a locked-down corporate network), either:

1. Build somewhere with normal internet access, or
2. Swap `next/font/google` for `next/font/local` in `app/layout.js` with
   self-hosted font files, or
3. Replace the three `next/font/google` calls with plain CSS font-family
   fallbacks (the `fontFamily` tokens in `tailwind.config.js` already have
   sans-serif/monospace fallbacks, so the site still looks reasonable
   without the custom fonts).

## Notes for production use

- Admin auth is demo-grade (plaintext password compare against the
  database, including the change-password flow). Hash passwords (bcrypt)
  and set a real `JWT_SECRET` env var before deploying.
- The contact form is a client-side demo (no email/DB write on submit) —
  wire it to a real endpoint or email service as needed.
- Block content is authored as raw JSON in the admin UI. Swapping in
  per-block-type form fields (instead of a JSON textarea) would improve the
  non-technical editor experience without changing the data model.
- Uploaded images are validated by declared MIME type and an 8MB size cap,
  but not deeply inspected — for a public-facing deployment, consider
  virus/content scanning and re-encoding on upload.
- The cookie-consent/analytics feature is a working mechanism, not a
  compliance guarantee — see the note under "Cookie consent" above.
- `@libsql/client` uses native bindings for local file databases — it's
  marked as a server-external package in `next.config.js` so Next.js
  doesn't try to bundle it.
