import { isDevMode, ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  provideClientHydration,
  withHttpTransferCacheOptions,
} from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { firstValueFrom, forkJoin } from 'rxjs';

import { routes } from './app.routes';
import { AppTranslocoLoader } from './i18n/transloco-loader';
import { LocaleService } from './i18n/locale.service';
import { authInterceptor } from './interceptors/auth.interceptor';
import { localeInterceptor } from './interceptors/locale.interceptor';

/** Transfer-cache only public catalog/content APIs — never cart, auth, or orders. */
function isPublicApiTransferCacheUrl(url: string): boolean {
  try {
    const path = new URL(url, 'http://local').pathname.toLowerCase();
    return (
      path.includes('/api/products') ||
      path.includes('/api/categories') ||
      path.includes('/api/news') ||
      path.includes('/api/settings') ||
      path.includes('/api/shipping')
    );
  } catch {
    return false;
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideClientHydration(
      withHttpTransferCacheOptions({
        filter: (req) => isPublicApiTransferCacheUrl(req.url),
      }),
    ),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, localeInterceptor])),
    provideRouter(routes, withComponentInputBinding()),
    provideTransloco({
      config: {
        availableLangs: ['ua', 'en'],
        defaultLang: 'ua',
        fallbackLang: 'ua',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: AppTranslocoLoader,
    }),
    provideAppInitializer(() => {
      const i18n = inject(TranslocoService);
      const locale = inject(LocaleService);
      // Follow LocaleService (URL will win later via setFromUrl) — never force UA over /en.
      i18n.setActiveLang(locale.lang());
      return firstValueFrom(forkJoin([i18n.load('ua'), i18n.load('en')]));
    }),
  ],
};
