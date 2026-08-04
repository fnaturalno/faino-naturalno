export const LOCALES = ['ua', 'en'] as const;
export type AppLocale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = 'ua';
export const LOCALE_STORAGE_KEY = 'fayno.locale';

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return value === 'ua' || value === 'en';
}

/** Map stored/legacy values (`uk`) onto current app locales. */
export function normalizeAppLocale(value: string | null | undefined): AppLocale | null {
  if (value === 'ua' || value === 'uk') return 'ua';
  if (value === 'en') return 'en';
  return null;
}

export function parseAcceptLanguage(header: string | null | undefined): AppLocale {
  if (!header?.trim()) return DEFAULT_LOCALE;
  const tokens = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const qParam = params.find((p) => p.trim().startsWith('q='));
      const q = qParam ? Number(qParam.trim().slice(2)) : 1;
      return { tag: tag.trim().toLowerCase(), q: Number.isFinite(q) ? q : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of tokens) {
    // BCP 47 language for Ukrainian is `uk`; app code is `ua`.
    if (tag.startsWith('uk') || tag.startsWith('ua')) return 'ua';
    if (tag.startsWith('en')) return 'en';
  }
  return DEFAULT_LOCALE;
}

/** Prefer Ukrainian by default; only return EN when no UA/UK and EN is present. */
export function preferBrowserLocale(): AppLocale {
  const list =
    typeof navigator !== 'undefined'
      ? [...(navigator.languages ?? []), navigator.language].filter(Boolean)
      : [];
  let sawEn = false;
  for (const lang of list) {
    const lower = lang.toLowerCase();
    if (lower.startsWith('uk') || lower.startsWith('ua')) return 'ua';
    if (lower.startsWith('en')) sawEn = true;
  }
  return sawEn ? 'en' : DEFAULT_LOCALE;
}

export function intlLocale(locale: AppLocale): string {
  return locale === 'en' ? 'en-US' : 'uk-UA';
}

/** BCP 47 hreflang for a storefront locale (Ukrainian stays `uk`). */
export function hreflangFor(locale: AppLocale): string {
  return locale === 'en' ? 'en' : 'uk';
}
