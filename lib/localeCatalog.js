// Plain data, no DB/server dependency — importable from admin (client)
// components as well as server code. The default locale is fixed to
// English on purpose (per product decision: English is always the
// fallback and is never removable from the enabled list).
export const DEFAULT_LOCALE = 'en';

// A reasonably broad catalog to pick languages from when enabling one.
// Adding a new language later just means adding a row here.
export const LOCALE_CATALOG = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'pl', label: 'Polski' },
  { code: 'sv', label: 'Svenska' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
  { code: 'ar', label: 'العربية' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ru', label: 'Русский' },
];

export const LOCALE_CODE_RE = /^[a-z]{2}$/;

export function catalogLabel(code) {
  return LOCALE_CATALOG.find((l) => l.code === code)?.label || code;
}
