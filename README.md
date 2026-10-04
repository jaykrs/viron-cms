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

## Centralized CSS (no inline styling in components)

The public site's header, footer, cookie banner, and every content block
(Hero, CTA, FeatureGrid, …) reference semantic class names only —
`site-header`, `block-hero__title`, `cookie-consent__input`, and so on.
None of their JSX carries long inline Tailwind utility strings. Every one
of those classes is defined exactly once, in `app/components.css`, using
Tailwind's `@apply` to compose the utilities — so the visual styling is
centralized in one file instead of scattered across component code, while
still getting Tailwind's design tokens (the `signal`/`amber` theme colors,
spacing scale, etc.) for free. `app/components.css` is imported once from
`app/globals.css`, so it's loaded at the page/layout level and available
everywhere automatically — no per-component import needed.

To restyle a block, edit its rules in `app/components.css`; you don't need
to touch the component file at all unless you're changing markup. The
admin console's own screens (the dashboard pages under `app/admin/**` and
the authoring widgets in `components/admin/`) are internal tooling rather
than site "components" and still use Tailwind utility classes directly —
ask if you'd like those centralized the same way too.

### A second design, switchable from the admin Theme page

`app/themes/modern.css` is a second, visually distinct stylesheet — rounded
cards, soft shadows, a gradient accent built from the site's primary/
secondary colors, pill-shaped buttons — that targets the **exact same**
class names as `app/components.css`. No component or page markup changes
between the two designs; only the CSS does.

Both stylesheets are always loaded. Which one actually renders is decided
by a `data-theme="classic" | "modern"` attribute on `<html>`
(`app/layout.js`), set from a `cssTheme` column on `theme_settings` — the
same table that already holds the primary/secondary colors. Every rule in
`modern.css` is scoped under `[data-theme='modern']`, so its selectors are
more specific than the unscoped classic ones and win automatically the
moment that attribute is set; there's no JavaScript theme-switching logic
at all, just a server-rendered attribute.

**To switch it**: open `/admin/theme` → **Design** → pick Classic or
Modern → Save. It takes effect immediately, site-wide, with no rebuild —
the same `PUT /api/theme` endpoint used for colors now also accepts
`{ "cssTheme": "modern" }`. The selection travels with the site's
export/import bundle, same as the colors.

**To add a third design**: create `app/themes/<name>.css` with the same
class names scoped under `[data-theme='<name>']`, import it from
`globals.css`, add `'<name>'` to `CSS_THEMES` in `lib/server/theme.js`, and
add it as an option in `app/admin/theme/page.jsx`'s design picker.

## Project layout

```
app/
  [[...slug]]/page.jsx     public catch-all route — resolves any page
                           (static or dynamic), generates SEO metadata,
                           calls lib/server/pages.js directly (no fetch)
  sitemap.js               machine-readable /sitemap.xml
  sitemap/page.jsx         human-readable /sitemap page
  globals.css              Tailwind entrypoint + base styles; imports components.css
                           and themes/modern.css
  components.css           "classic" design — centralized semantic CSS for the
                           header, footer, cookie banner, and every content block
  themes/
    modern.css             "modern" design — same class names as components.css,
                           scoped under [data-theme='modern'] (see section above)
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
    contact/route.js                  contact form: submit (public POST, verifies
                                       reCAPTCHA if configured) / widget config (public GET)
    contact-submissions/route.js      admin inbox: list + filter/search (auth)
    contact-submissions/[id]/route.js get / update status / delete (auth)
    graphql/route.js                  GraphQL endpoint: queries public, mutations need a token
    graphql/schema/route.js           schema as SDL (public)
    content-models/route.js           admin REST for models (auth) — same service layer as GraphQL
    content-models/[id]/route.js
    content-fragments/route.js        admin REST for fragments (auth)
    content-fragments/[id]/route.js
    locales/route.js                  enabled languages: list (public) / enable (auth)
    locales/[code]/route.js           disable a language (auth)
    pages/[id]/translations/route.js  sibling pages in other languages (auth)
    pages/[id]/translate/route.js     create a draft translation (auth)
    export/route.js                   full site content bundle (auth)
    import/route.js                   restore/merge a bundle (auth)
  admin/                   admin console (pages list, editor, header/footer
                           library, assets, theme, visitors, export/import,
                           settings) — client components calling /api/*
lib/
  localeCatalog.js  the fixed language catalog + default-locale constant (plain
                    data, importable from both server code and admin client pages)
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
    contactSubmissions.js contact form submissions: validate, store, list/filter, status, delete
    recaptcha.js    Google reCAPTCHA v2 server-side verification (no-op if unconfigured)
    contentFragments.js content models (schemas), fragments, validation, querying
    graphql.js      dynamic GraphQL schema built from the models; request execution
    locales.js      enabled-languages service (list/enable/disable)
    exportImport.js assembles/restores the full site content bundle
    errors.js       shared ApiError class
    routeHelpers.js shared error handling + auth guard for route handlers
  api.js          browser-side fetch client used by the admin console
                  (relative /api/* paths — same origin now)
components/
  Header.jsx, Footer.jsx, ComponentRenderer.jsx (block registry + {{param}}
  substitution), CookieConsent.jsx (accept/reject banner + tracking),
  blocks/ (8 content block components, several with image support: Hero,
  CTA, FeatureGrid, Testimonials), admin/ (block editor, asset picker modal,
  ModelEditor schema builder, FragmentForm schema-driven form)
scripts/
  seed.js         seeds the Vireon Labs demo content, admin user, theme
                  defaults, and a French translation of Home and About
                  (with its own translated header/footer) to demonstrate
                  the multilingual feature out of the box
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
  reusable `components` (kind `header` / `footer`) with JSON props.
  `/admin/components` lists them; clicking one opens its own detail page
  (`/admin/components/[id]`, with a "← Back to header & footer" link) to
  edit its name/props or delete it — deleting is blocked with a clear error
  if the component is still assigned to a page or is the theme's default.
  Each page picks one of each — or leaves it as "Use theme default" to
  inherit the site-wide default (see Theme, below).
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

### Contact form submissions & reCAPTCHA

The `ContactForm` block (`components/blocks/ContactForm.jsx`) is wired to a
real backend, not a client-side-only demo:

- Submitting the form POSTs to the public `/api/contact` endpoint, which
  validates the fields and writes a row to the `contact_submissions` table
  (`lib/server/contactSubmissions.js`) — name, email, message, the page it
  was sent from, and its locale.
- `/admin/contact-submissions` lists every submission (filterable by
  read/unread status, searchable by name/email/message), with mark-as-
  read/unread and delete actions. `/admin/contact-submissions/[id]` shows
  the full message and auto-marks it read on open.
- Submissions are intentionally excluded from the site export/import
  bundle, for the same reason visitor analytics is — it's visitor-submitted
  data captured from the live site, not admin-authored content you'd want
  to carry between environments.

**Google reCAPTCHA (v2 checkbox)** guards the public form against spam, and
degrades gracefully like the app's other optional services (Redis, Turso):
with no keys set, the form works exactly as before, with no widget and no
verification step. To turn it on:

1. Register a reCAPTCHA v2 ("I'm not a robot" checkbox) site at
   https://www.google.com/recaptcha/admin for `localhost` (and your real
   domain, if deploying).
2. Add both keys to `.env.local`:
   ```
   NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-site-key
   RECAPTCHA_SECRET_KEY=your-secret-key
   ```
3. Restart the dev server. The contact form now renders the checkbox widget
   and `/api/contact` rejects submissions with a missing or invalid token
   (verified server-side against Google's `siteverify` endpoint in
   `lib/server/recaptcha.js`).

### Content fragments & GraphQL (AEM-style structured content)

Beyond page blocks, the CMS has **content models** (user-defined schemas) and
**content fragments** (entries of a model), exposed over GraphQL.

**Models** (`/admin/content-models`) — a schema builder. Each field has a key,
label, type, required flag, optional "multiple values" list, and help text.
Field types: single-line text, multi-line text, rich text, number, whole
number, yes/no, date, date-time, enumeration (options list), image (picked
from the asset library), **fragment reference** (points at another model —
or the same one), and JSON. A model's `apiName` (PascalCase) is fixed after
creation because it is part of the public GraphQL contract.

**Fragments** (`/admin/content-fragments`) — the form is generated from the
model, so a new model instantly has a working create/edit form: the right
input per type, repeatable inputs for list fields, an asset picker for
images, and a dropdown of existing fragments for references. Each fragment
has a title, a URL-safe name (its `_path` is `/{Model}/{name}`), and a
`draft` / `published` status. Everything is validated server-side against the
model (required fields, types, enum options, reference targets, image URL
scheme) — the forms are a convenience, not the only line of defense.

**GraphQL** — `POST` or `GET` `/api/graphql`. The schema is *generated from
the models* and rebuilds automatically when a model changes (no restart):

| For a model `Article`… | |
|---|---|
| `articleList(limit, offset, sortBy, sortDir, filter)` | `{ items, total }` |
| `articleById(id)`, `articleByPath(path)` | one fragment or `null` |
| `createArticle(title, name, status, data)` | needs token |
| `updateArticle(id, title, name, status, data)` | needs token — partial update, `null` clears a field |
| `deleteArticle(id)` | needs token |

Plus `contentModels` / `contentModel(apiName)` (public) and
`createContentModel` / `updateContentModel` / `deleteContentModel` (token).
Every fragment also exposes `_id _path _name _title _status _model _createdAt
_updatedAt`. `filter` takes `{"category":"AI"}` or operators:
`{"headline":{"contains":"cloud"}}` (`eq ne contains startsWith gt gte lt lte in`).

**Access model**
- **Queries are public** and only ever return `published` fragments (this
  includes fragments reached through references).
- **Mutations require** `Authorization: Bearer <token>` — the same JWT the
  admin login issues (`POST /api/auth/login`). Without one the API answers
  `401`, and mutations over `GET` are refused with `405`. Create maps to the
  usual `POST`, update to `PUT`, delete to `DELETE` — as GraphQL mutations.
- A request carrying a valid token also sees **drafts**, so an authenticated
  preview client works with the same queries.
- The public endpoint has CORS open (auth is a header, never a cookie),
  a 20 KB query limit, a max nesting depth of 10, a max of 300 selected
  fields (stops alias flooding), and `limit` capped at 100.

```bash
# public read
curl -G http://localhost:3000/api/graphql \
  --data-urlencode 'query={ articleList { total items { _path headline author { fullName } } } }'

# authenticated write
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin","password":"admin123"}' | python3 -c 'import json,sys;print(json.load(sys.stdin)["token"])')
curl -X POST http://localhost:3000/api/graphql -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"query":"mutation { createFaq(title:\"New\", status:\"published\", data:{question:\"Q?\", answer:\"A.\"}) { _path } }"}'
```

`/admin/graphql` is a small playground (run queries anonymously or with your
admin token, browse the SDL). The seed creates three models — **Author**,
**Article** (with a reference to Author, tags list, enum, date, boolean,
integer), **Faq** — with sample fragments, one of which is a draft.

Design notes: field values live in a JSON column and list queries filter/sort
with `json_extract` (fine for thousands of fragments per model; a very large
catalog would want indexed columns). References are stored as fragment ids;
deleting a referenced fragment leaves a dangling reference that resolves to
`null` rather than erroring. Models that are referenced by other models — or
that still have fragments — can't be deleted without an explicit `force`.
The admin UI uses REST routes (`/api/content-models`, `/api/content-fragments`)
that share the same service layer and validation as the GraphQL mutations.

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
- **Design** — switches the whole site between the `classic` and `modern`
  stylesheets (`cssTheme` in `theme_settings`) — see "A second design,
  switchable from the admin Theme page" above.
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

### Multilingual pages

English is the fixed default language, always served at the site root with
no URL prefix (`/about`). Every other language you enable (`/admin/languages`)
gets its own prefix — e.g. French lives at `/fr/about` — and shows up in a
language switcher in the header.

- **Data model**: `pages.locale` (default `'en'`), with the uniqueness
  constraint on `(locale, slug)` instead of `slug` alone. A "translation" of
  a page is simply another row with the **same slug**, a different
  `locale` — that shared slug is what the switcher and hreflang tags use to
  find the sibling pages. A slug can't start with a language code (e.g.
  `fr`, `fr/anything`) — that's rejected at creation/update time, since it
  would be indistinguishable from a locale-prefixed URL.
- **Resolving a URL**: `app/[[...slug]]/page.jsx` checks whether the first
  path segment is an *enabled* language code; if so that's the locale and
  the rest of the path is the page's slug, otherwise the whole path is the
  slug under English. `resolvePublicPage(locale, segments)` in
  `lib/server/pages.js` then tries that locale first and, if nothing
  matches, **falls back to the English version of the same slug** rather
  than 404ing — so a URL like `/fr/contact` still renders (in English) even
  before anyone has translated that particular page. The response says
  which locale was actually served (`resolvedLocale`) versus requested
  (`requestedLocale`), in case a caller wants to tell the two apart.
- **Links stay inside the language the visitor is browsing**: every
  internal link field across every block, header, and footer schema is
  named exactly `href`, so `localizeHrefs()` in
  `components/ComponentRenderer.jsx` walks a props tree and prefixes any
  `href` starting with `/` with the current (requested) locale — external
  URLs, `mailto:`, and already-prefixed paths are left alone. This runs
  server-side before anything reaches Header/Footer/blocks, so a page that's
  falling back to English content still links to `/fr/...` elsewhere on the
  site rather than dropping the visitor back into the English section.
- **Translating a page**: open a page in `/admin/pages/[id]/edit` — the
  Translations panel lists every enabled language and offers "Create X
  translation" for any that don't have one yet. That copies the current
  page's blocks, header/footer, and SEO into a new **draft** page with the
  same slug under the target locale, ready to translate; publishing it is
  what makes `resolvePublicPage` start serving it instead of the English
  fallback. A header/footer is assigned per page like anywhere else in this
  CMS, so a translated page can (and in the seed, does) use its own
  translated header/footer component instead of inheriting the English one.
- **SEO**: `generateMetadata` adds `alternates.languages` (hreflang tags)
  for every *published* sibling translation of a static page, plus
  `openGraph.locale`. `/sitemap.xml` and the human `/sitemap` page both list
  every published page in every language it exists in (the human one shows
  a small language badge next to non-English entries).
- **Admin**: `/admin/languages` enables/disables languages from a fixed
  catalog (`lib/localeCatalog.js`) — English can't be removed, and a
  language with pages still using it can't be removed either. The page
  list, the new-page form, and the page editor all show/filter by language.
- **Export/import**: each page's `locale` travels in the export bundle,
  along with the list of enabled languages (re-enabled automatically on
  import) — format version 3.

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
the theme, **and all content models and content fragments** — as one JSON
file (`lib/server/exportImport.js`, format version 2; version-1 files still import).

- **Export** references components by *name*, not numeric id, so a bundle
  exported from one database imports cleanly into a different one (e.g.
  moving from the local file database to Turso, or between two separate
  Turso databases) without id collisions.
- **Import upserts**: pages are matched by slug, components by name.
  Anything matching is updated in place (its blocks are fully replaced);
  anything new is created. Nothing outside the bundle is ever deleted, so
  re-running the same import twice is safe, and importing a partial bundle
  (e.g. just one page) won't touch the rest of the site.
- Fragment references are exported as `/Model/name` paths and re-linked on
  import (models first, then fragments in two passes, so cycles and
  forward references work). A fragment that fails validation is reported in
  the result and skipped; it never blocks the rest of the import.
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
- French demo: `http://localhost:3000/fr` and `http://localhost:3000/fr/about`
  (seeded translations), or the language switcher in the header

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
