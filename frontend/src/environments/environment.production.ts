export const environment = {
  production: true,
  apiBaseUrl: 'https://faino-naturalno-production.up.railway.app',
  /** Hardcoded intentionally for canonical/hreflang/og:url — do not use document.location. */
  siteOrigin: 'https://f-n.fun',
} as const;
