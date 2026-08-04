import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { LocaleService } from '../i18n/locale.service';

/** API paths whose responses include locale-selected product/category display names. */
const LOCALE_API_PATTERN =
  /\/api\/(products|categories|cart|orders|admin\/orders)(\/|$|\?)/i;

/**
 * Attach `?locale=` so names match the active UI language (including cart mutations
 * that return a full cart payload).
 */
export const localeInterceptor: HttpInterceptorFn = (req, next) => {
  if (!LOCALE_API_PATTERN.test(req.url)) {
    return next(req);
  }
  if (req.params.has('locale')) {
    return next(req);
  }
  const locale = inject(LocaleService).lang();
  return next(req.clone({ params: req.params.set('locale', locale) }));
};
