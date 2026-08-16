import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { catchError, filter, map, merge, of, switchMap } from 'rxjs';

import { LanguageSwitcherComponent } from '../language-switcher/language-switcher.component';
import { LocaleService } from '../../i18n/locale.service';
import { CategorySummary } from '../../models/catalog.models';
import { initialsOf } from '../../pages/auth/auth.helpers';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { CategoryService } from '../../services/category.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, IconComponent, LanguageSwitcherComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  protected readonly cart = inject(CartService);
  protected readonly auth = inject(AuthService);
  protected readonly locale = inject(LocaleService);
  private readonly categoriesApi = inject(CategoryService);
  private readonly i18n = inject(TranslocoService);
  private readonly router = inject(Router);
  protected readonly menuOpen = signal(false);

  protected readonly categories = toSignal(
    toObservable(this.locale.lang).pipe(
      switchMap(() =>
        this.categoriesApi.getCategories().pipe(
          map((response) => (response.success ? sortCategories(response.data) : [])),
          catchError(() => of([] as CategorySummary[])),
        ),
      ),
    ),
    { initialValue: [] as CategorySummary[] },
  );

  /** Re-read router.url on every NavigationEnd and once on subscribe (covers redirects). */
  private readonly currentUrl = toSignal(
    merge(
      of(null),
      this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)),
    ).pipe(map(() => this.router.url)),
    { initialValue: this.router.url },
  );

  private readonly path = computed(() => {
    this.locale.lang();
    return (this.currentUrl().split(/[?#]/)[0] ?? '').replace(/\/$/, '') || '/';
  });

  /** Admin pages have no locale prefix — switcher only updates UI language. */
  protected readonly switcherMode = computed(() =>
    this.path().startsWith('/admin') ? 'ui' : 'storefront',
  );

  protected readonly isCatalogActive = computed(() => {
    const path = this.path();
    const locale = this.locale.lang();
    return path === `/${locale}` || path.startsWith(`/${locale}/catalog`);
  });

  private readonly selectedCategorySlugs = computed(() => {
    const query = this.currentUrl().split('?')[1]?.split('#')[0] ?? '';
    const raw = new URLSearchParams(query).get('category') ?? '';
    return new Set(
      raw
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    );
  });

  protected readonly isCatalogAllActive = computed(
    () => this.isCatalogActive() && this.selectedCategorySlugs().size === 0,
  );

  protected isCategoryActive(slug: string): boolean {
    return this.selectedCategorySlugs().has(slug);
  }

  protected readonly isAboutActive = computed(() => this.isStorefrontSection('about'));
  protected readonly isContactsActive = computed(() => this.isStorefrontSection('contacts'));
  protected readonly isNewsActive = computed(() => this.isStorefrontSection('news'));
  protected readonly isPaymentDeliveryActive = computed(() =>
    this.isStorefrontSection('payment-delivery'),
  );
  protected readonly isProfileActive = computed(() => this.isStorefrontSection('profile'));
  protected readonly isLoginActive = computed(() => {
    const path = this.path();
    const locale = this.locale.lang();
    return path === `/${locale}/auth/login`;
  });
  protected readonly isAdminActive = computed(() => this.path().startsWith('/admin'));

  protected readonly fullName = computed(() => {
    const user = this.auth.currentUser();
    const name = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
    return name || this.i18n.translate('nav.user');
  });

  protected readonly initials = computed(() => {
    const user = this.auth.currentUser();
    return user ? initialsOf(user.firstName, user.lastName) : '?';
  });

  protected readonly roleLabel = computed(() =>
    this.auth.currentUser()?.isAdmin
      ? this.i18n.translate('nav.roleAdmin')
      : this.i18n.translate('nav.roleClient'),
  );

  protected readonly loggingOut = signal(false);

  private isStorefrontSection(section: string): boolean {
    const path = this.path();
    const locale = this.locale.lang();
    const prefix = `/${locale}/${section}`;
    return path === prefix || path.startsWith(`${prefix}/`);
  }

  protected logout(): void {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    this.menuOpen.set(false);
    this.auth.logout().subscribe({
      next: () => {
        this.loggingOut.set(false);
        void this.router.navigate(this.locale.commands('catalog'));
      },
      error: () => {
        this.auth.clearSession();
        this.loggingOut.set(false);
        void this.router.navigate(this.locale.commands('catalog'));
      },
    });
  }

  /** Desktop: open drawer. Mobile: navigate to /:lang/cart. */
  protected onCartClick(): void {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
      this.cart.openDrawer();
      return;
    }
    void this.router.navigate(this.locale.commands('cart'));
  }
}

function sortCategories(categories: CategorySummary[]): CategorySummary[] {
  return [...categories]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((category) => ({
      ...category,
      children: [...(category.children ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    }));
}
