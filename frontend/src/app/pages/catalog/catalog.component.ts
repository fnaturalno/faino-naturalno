import { A11yModule } from '@angular/cdk/a11y';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { finalize } from 'rxjs';

import { IconComponent } from '../../components/icon/icon.component';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { LocaleService } from '../../i18n/locale.service';
import { SeoService } from '../../i18n/seo.service';
import { CatalogFilters, CatalogSort } from '../../models/catalog.models';
import { CartService } from '../../services/cart.service';
import { CatalogStore } from './catalog.store';

@Component({
  selector: 'app-catalog',
  imports: [A11yModule, IconComponent, NavbarComponent, ProductCardComponent, TranslocoPipe],
  providers: [CatalogStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './catalog.component.html',
})
export class CatalogComponent {
  protected readonly store = inject(CatalogStore);
  private readonly cart = inject(CartService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject(TranslocoService);
  protected readonly locale = inject(LocaleService);
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);
  private toastTimer?: ReturnType<typeof setTimeout>;
  private loadMoreObserver?: IntersectionObserver;

  @ViewChild('mobileFilterButton') private mobileFilterButton?: ElementRef<HTMLButtonElement>;
  private readonly loadMoreSentinel = viewChild<ElementRef<HTMLElement>>('loadMoreSentinel');

  constructor() {
    effect(() => {
      this.locale.lang();
      const isHome = this.route.snapshot.routeConfig?.path === '';
      this.seo.setAlternates(
        isHome ? '' : 'catalog',
        this.i18n.translate(isHome ? 'brand' : 'catalog.title'),
      );
    });

    afterNextRender(() => {
      this.loadMoreObserver = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            this.store.loadMore();
          }
        },
        { root: null, rootMargin: '280px 0px', threshold: 0 },
      );
    });

    effect(() => {
      const sentinel = this.loadMoreSentinel()?.nativeElement;
      const hasMore = this.store.hasMore();
      const busy =
        this.store.initialLoading() || this.store.refetching() || this.store.loadingMore();
      this.loadMoreObserver?.disconnect();
      if (sentinel && hasMore && !busy && this.loadMoreObserver) {
        this.loadMoreObserver.observe(sentinel);
      }
    });

    this.destroyRef.onDestroy(() => {
      clearTimeout(this.toastTimer);
      document.body.style.overflow = '';
      this.seo.clear();
      this.loadMoreObserver?.disconnect();
    });
  }

  protected readonly tabletFiltersOpen = signal(false);
  protected readonly sheetOpen = signal(false);
  protected readonly pendingFilters = signal<CatalogFilters | null>(null);
  protected readonly toast = signal<{ message: string; error: boolean } | null>(null);
  protected readonly cartStatuses = signal<Record<number, 'idle' | 'adding' | 'added'>>({});
  protected readonly skeletons = Array.from({ length: 15 }, (_, index) => index);

  protected readonly sortOptions: { value: CatalogSort; labelKey: string }[] = [
    { value: 'popular', labelKey: 'catalog.sortPopular' },
    { value: 'price-asc', labelKey: 'catalog.sortPriceAsc' },
    { value: 'price-desc', labelKey: 'catalog.sortPriceDesc' },
    { value: 'new', labelKey: 'catalog.sortNew' },
    { value: 'name-asc', labelKey: 'catalog.sortNameAsc' },
  ];

  protected readonly productsCountLabel = computed(() => {
    const count = this.store.page()?.totalCount ?? 0;
    const form = this.locale.pluralForm(count);
    return { key: `plural.products.${form}`, count };
  });

  protected readonly activeFilterCount = computed(() => {
    const filters = this.store.filters();
    return filters.categories.length + Number(filters.minPrice !== null) + Number(filters.maxPrice !== null);
  });

  protected toggleAppliedCategory(slug: string): void {
    const selected = this.store.filters().categories;
    this.store.updateCategories(
      selected.includes(slug) ? selected.filter((value) => value !== slug) : [...selected, slug],
    );
  }

  protected updateSort(value: string): void {
    this.store.updateSort(value as CatalogSort);
  }

  protected updateAppliedPrice(kind: 'min' | 'max', value: string): void {
    this.store.queuePrice(kind, this.toPrice(value));
  }

  protected openSheet(): void {
    const pending = { ...this.store.filters(), categories: [...this.store.filters().categories] };
    this.pendingFilters.set(pending);
    this.store.preview(pending);
    this.sheetOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  protected closeSheet(): void {
    this.sheetOpen.set(false);
    this.pendingFilters.set(null);
    this.store.clearPreview();
    document.body.style.overflow = '';
    setTimeout(() => this.mobileFilterButton?.nativeElement.focus());
  }

  protected togglePendingCategory(slug: string): void {
    const pending = this.pendingFilters();
    if (!pending) return;
    const categories = pending.categories.includes(slug)
      ? pending.categories.filter((value) => value !== slug)
      : [...pending.categories, slug];
    this.setPending({ ...pending, categories });
  }

  protected updatePendingPrice(kind: 'min' | 'max', value: string): void {
    const pending = this.pendingFilters();
    if (!pending) return;
    this.setPending({
      ...pending,
      [kind === 'min' ? 'minPrice' : 'maxPrice']: this.toPrice(value),
    });
  }

  protected resetPending(): void {
    const pending: CatalogFilters = {
      categories: [],
      minPrice: null,
      maxPrice: null,
      sortBy: 'popular',
      page: 1,
    };
    this.setPending(pending);
  }

  protected applyPending(): void {
    const pending = this.pendingFilters();
    if (!pending) return;
    this.store.applyPending(pending);
    this.closeSheet();
  }

  protected addToCart(event: { productId: number; variantId: number }): void {
    const { productId, variantId } = event;
    if (this.cartStatuses()[productId] === 'adding') return;
    if (!variantId) {
      this.showToast(this.i18n.translate('catalog.addError'), true);
      return;
    }
    this.setCartStatus(productId, 'adding');
    this.cart
      .addItem(variantId)
      .pipe(
        finalize(() => {
          if (this.cartStatuses()[productId] === 'adding') this.setCartStatus(productId, 'idle');
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          if (!response.success) {
            this.showToast(response.error ?? this.i18n.translate('catalog.addError'), true);
            return;
          }
          this.setCartStatus(productId, 'added');
          this.showToast(this.i18n.translate('catalog.added'), false);
          setTimeout(() => this.setCartStatus(productId, 'idle'), 1200);
        },
        error: () => this.showToast(this.i18n.translate('catalog.addError'), true),
      });
  }

  protected cartStatus(id: number): 'idle' | 'adding' | 'added' {
    return this.cartStatuses()[id] ?? 'idle';
  }

  private setPending(filters: CatalogFilters): void {
    let { minPrice, maxPrice } = filters;
    if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
      [minPrice, maxPrice] = [maxPrice, minPrice];
    }
    const normalized = { ...filters, minPrice, maxPrice };
    this.pendingFilters.set(normalized);
    this.store.preview(normalized);
  }

  private setCartStatus(id: number, status: 'idle' | 'adding' | 'added'): void {
    this.cartStatuses.update((statuses) => ({ ...statuses, [id]: status }));
  }

  private showToast(message: string, error: boolean): void {
    clearTimeout(this.toastTimer);
    this.toast.set({ message, error });
    this.toastTimer = setTimeout(() => this.toast.set(null), 3000);
  }

  private toPrice(value: string): number | null {
    if (!value.trim()) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }
}
