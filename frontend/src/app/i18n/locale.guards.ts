import { inject } from '@angular/core';
import {
  CanActivateFn,
  CanMatchFn,
  RedirectCommand,
  Router,
} from '@angular/router';

import { LocaleService } from './locale.service';
import { DEFAULT_LOCALE, isAppLocale } from './locale.types';

/** Only match `:lang` when it is `ua` or `en`. */
export const localeCanMatch: CanMatchFn = (_route, segments) => {
  const lang = segments[0]?.path;
  return isAppLocale(lang);
};

/** Apply URL locale to Transloco + storage. */
export const localeActivate: CanActivateFn = (route) => {
  const lang = route.paramMap.get('lang');
  if (!isAppLocale(lang)) {
    return inject(Router).createUrlTree([`/${DEFAULT_LOCALE}`]);
  }
  inject(LocaleService).setFromUrl(lang);
  return true;
};

/** Bare `/` → Ukrainian (default locale). Language switcher still allows EN. */
export const rootLocaleRedirect: CanActivateFn = () => {
  const router = inject(Router);
  return new RedirectCommand(router.parseUrl(`/${DEFAULT_LOCALE}`), { replaceUrl: true });
};

/**
 * Legacy unprefixed storefront URLs → `/ua` + same path + query.
 * Also redirects old `/uk/...` prefixes to `/ua/...`.
 */
export const legacyUkRedirect: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const url = state.url || '/';
  if (url === '/' || url.startsWith('/?')) {
    return rootLocaleRedirect(_route, state);
  }
  if (url.startsWith('/admin')) {
    return true;
  }
  // Old bookmarks: /uk/catalog → /ua/catalog
  if (url === '/uk' || url.startsWith('/uk/') || url.startsWith('/uk?')) {
    const rest = url.slice(3);
    const target =
      rest.startsWith('/') || rest.startsWith('?') || rest === ''
        ? `/${DEFAULT_LOCALE}${rest}`
        : `/${DEFAULT_LOCALE}/${rest}`;
    return new RedirectCommand(router.parseUrl(target), { replaceUrl: true });
  }
  const target = url.startsWith('/') ? `/${DEFAULT_LOCALE}${url}` : `/${DEFAULT_LOCALE}/${url}`;
  return new RedirectCommand(router.parseUrl(target), { replaceUrl: true });
};
