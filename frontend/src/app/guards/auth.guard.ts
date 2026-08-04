import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { LocaleService } from '../i18n/locale.service';
import { AuthService } from '../services/auth.service';

/** Protects routes that require a logged-in user. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const locale = inject(LocaleService);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(locale.commands('auth', 'login'), {
    queryParams: { returnUrl: state.url },
  });
};

/** Sends logged-in users away from public auth pages. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const locale = inject(LocaleService);

  if (!auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(locale.commands('profile'));
};
