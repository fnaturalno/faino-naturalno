export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:5000',
  /** Dev SSR/CSR origin. Production uses a fixed public domain for canonical URLs. */
  siteOrigin: 'http://localhost:4200',
} as const;
