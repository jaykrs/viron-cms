function authHeaders() {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('cms_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? authHeaders() : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  if (!res.ok) {
    let detail;
    try {
      detail = await res.json();
    } catch {
      detail = { error: res.statusText };
    }
    const err = new Error(detail.error || 'Request failed');
    err.status = res.status;
    err.detail = detail;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

// ---------- Auth ----------
export const login = (email, password) =>
  request('/api/auth/login', { method: 'POST', body: { email, password } });

export const changePassword = (currentPassword, newPassword) =>
  request('/api/auth/password', { method: 'PUT', body: { currentPassword, newPassword }, auth: true });

// ---------- Admin: pages ----------
export const listPages = () => request('/api/pages', { auth: true });
export const getPage = (id) => request(`/api/pages/${id}`, { auth: true });
export const createPage = (data) => request('/api/pages', { method: 'POST', body: data, auth: true });
export const updatePage = (id, data) => request(`/api/pages/${id}`, { method: 'PUT', body: data, auth: true });
export const publishPage = (id) => request(`/api/pages/${id}/publish`, { method: 'POST', auth: true });
export const unpublishPage = (id) => request(`/api/pages/${id}/unpublish`, { method: 'POST', auth: true });
export const deletePage = (id) => request(`/api/pages/${id}`, { method: 'DELETE', auth: true });

// ---------- Admin: components (header/footer library) ----------
export const listComponents = (kind) =>
  request(`/api/components${kind ? `?kind=${kind}` : ''}`, { auth: true });
export const createComponent = (data) => request('/api/components', { method: 'POST', body: data, auth: true });
export const updateComponent = (id, data) =>
  request(`/api/components/${id}`, { method: 'PUT', body: data, auth: true });

// ---------- Admin: theme (primary/secondary color, default header/footer) ----------
export const getTheme = () => request('/api/theme');
export const updateTheme = (data) => request('/api/theme', { method: 'PUT', body: data, auth: true });

// ---------- Admin: assets (image library) ----------
export const listAssets = () => request('/api/assets', { auth: true });
export const deleteAsset = (id) => request(`/api/assets/${id}`, { method: 'DELETE', auth: true });

export async function uploadAsset(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/assets', {
    method: 'POST',
    headers: { ...authHeaders() }, // no Content-Type — the browser sets the multipart boundary
    body: formData,
  });
  if (!res.ok) {
    let detail;
    try {
      detail = await res.json();
    } catch {
      detail = { error: res.statusText };
    }
    const err = new Error(detail.error || 'Upload failed');
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// ---------- Visitors (cookie consent + analytics journey) ----------
// The two below are called from the public cookie banner — no auth header,
// no admin token required, by design.
export const submitVisitorConsent = (visitorUid, email) =>
  request('/api/visitors', { method: 'POST', body: { visitorUid, email } });
export const trackPageView = (visitorUid, path, title, referrer) =>
  request('/api/visitors/track', { method: 'POST', body: { visitorUid, path, title, referrer } });

export const listVisitors = () => request('/api/visitors', { auth: true });
export const getVisitorJourney = (id) => request(`/api/visitors/${id}`, { auth: true });
export const deleteVisitorRecord = (id) => request(`/api/visitors/${id}`, { method: 'DELETE', auth: true });

// ---------- Contact form submissions ----------
// Public — called from the ContactForm block. GET tells the form whether to
// render the reCAPTCHA widget; POST submits the brief.
export const getContactFormConfig = () => request('/api/contact');
export const submitContactForm = (data) => request('/api/contact', { method: 'POST', body: data });

// Admin inbox
export const listContactSubmissions = (params = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  return request(`/api/contact-submissions${qs ? `?${qs}` : ''}`, { auth: true });
};
export const getContactSubmission = (id) => request(`/api/contact-submissions/${id}`, { auth: true });
export const updateContactSubmissionStatus = (id, status) =>
  request(`/api/contact-submissions/${id}`, { method: 'PUT', body: { status }, auth: true });
export const deleteContactSubmission = (id) =>
  request(`/api/contact-submissions/${id}`, { method: 'DELETE', auth: true });

// ---------- Site export / import ----------
// Export needs an Authorization header, so it can't be a plain <a href>
// link — fetch it as a blob and trigger the download manually.
export async function downloadSiteExport() {
  const res = await fetch('/api/export', { headers: { ...authHeaders() } });
  if (!res.ok) {
    let detail;
    try {
      detail = await res.json();
    } catch {
      detail = { error: res.statusText };
    }
    throw new Error(detail.error || 'Export failed');
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match ? match[1] : 'site-export.json';

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const importSiteBundle = (bundle) => request('/api/import', { method: 'POST', body: bundle, auth: true });

// ---------- Languages (multilingual pages) ----------
export const listLocales = () => request('/api/locales');
export const enableLocale = (code) => request('/api/locales', { method: 'POST', body: { code }, auth: true });
export const disableLocale = (code) => request(`/api/locales/${code}`, { method: 'DELETE', auth: true });
export const listPageTranslations = (id) => request(`/api/pages/${id}/translations`, { auth: true });
export const createPageTranslation = (id, locale) =>
  request(`/api/pages/${id}/translate`, { method: 'POST', body: { locale }, auth: true });

// ---------- Content models & fragments (admin) ----------
export const listContentModels = () => request('/api/content-models', { auth: true });
export const getContentModel = (id) => request(`/api/content-models/${id}`, { auth: true });
export const createContentModel = (data) =>
  request('/api/content-models', { method: 'POST', body: data, auth: true });
export const updateContentModel = (id, data) =>
  request(`/api/content-models/${id}`, { method: 'PUT', body: data, auth: true });
export const deleteContentModel = (id, force = false) =>
  request(`/api/content-models/${id}${force ? '?force=1' : ''}`, { method: 'DELETE', auth: true });

export const listContentFragments = (params = {}) => {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null));
  return request(`/api/content-fragments${qs.toString() ? `?${qs}` : ''}`, { auth: true });
};
export const getContentFragment = (id) => request(`/api/content-fragments/${id}`, { auth: true });
export const createContentFragment = (data) =>
  request('/api/content-fragments', { method: 'POST', body: data, auth: true });
export const updateContentFragment = (id, data) =>
  request(`/api/content-fragments/${id}`, { method: 'PUT', body: data, auth: true });
export const deleteContentFragment = (id) =>
  request(`/api/content-fragments/${id}`, { method: 'DELETE', auth: true });

// ---------- GraphQL playground helper ----------
// useToken=false sends the request exactly like an anonymous public client.
export async function runGraphQL({ query, variables, useToken }) {
  const res = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(useToken ? authHeaders() : {}) },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}
export const fetchGraphQLSchema = async () => (await fetch('/api/graphql/schema')).text();
