import { A11yModule } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { IconComponent } from '../../components/icon/icon.component';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { CatalogFilters, CatalogSort } from '../../models/catalog.models';
import { CartService } from '../../services/cart.service';
import { CatalogStore } from './catalog.store';

@Component({
  selector: 'app-catalog',
  imports: [A11yModule, IconComponent, NavbarComponent, ProductCardComponent],
  providers: [CatalogStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './catalog.component.html',
})
export class CatalogComponent {
  protected readonly store = inject(CatalogStore);
  private readonly cart = inject(CartService);
  private readonly destroyRef = inject(DestroyRef);
  private toastTimer?: ReturnType<typeof setTimeout>;

  @ViewChild('mobileFilterButton') private mobileFilterButton?: ElementRef<HTMLButtonElement>;

  constructor() {
    this.destroyRef.onDestroy(() => {
      clearTimeout(this.toastTimer);
      document.body.style.overflow = '';
    });
  }

  protected readonly tabletFiltersOpen = signal(false);
  protected readonly sheetOpen = signal(false);
  protected readonly pendingFilters = signal<CatalogFilters | null>(null);
  protected readonly toast = signal<{ message: string; error: boolean } | null>(null);
  protected readonly cartStatuses = signal<Record<number, 'idle' | 'adding' | 'added'>>({});
  protected readonly skeletons = Array.from({ length: 9 }, (_, index) => index);
  protected readonly sortOptions: { value: CatalogSort; label: string }[] = [
    { value: 'popular', label: 'За популярністю' },
    { value: 'price-asc', label: 'За ціною ↑' },
    { value: 'price-desc', label: 'За ціною ↓' },
    { value: 'new', label: 'Новинки' },
  ];

  protected readonly activeFilterCount = computed(() => {
    const filters = this.store.filters();
    return filters.categories.length + Number(filters.minPrice !== null) + Number(filters.maxPrice !== null);
  });

  protected readonly pagination = computed<(number | 'ellipsis')[]>(() => {
    const total = this.store.page()?.totalPages ?? 0;
    const current = this.store.page()?.page ?? 1;
    if (total <= 7) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }
    const pages = new Set([1, total, current - 1, current, current + 1]);
    const sorted = [...pages].filter((page) => page > 0 && page <= total).sort((a, b) => a - b);
    const result: (number | 'ellipsis')[] = [];
    sorted.forEach((page, index) => {
      if (index && page - sorted[index - 1] > 1) {
        result.push('ellipsis');
      }
      result.push(page);
    });
    return result;
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

  protected addToCart(productId: number): void {
    if (this.cartStatuses()[productId] === 'adding') return;
    this.setCartStatus(productId, 'adding');
    this.cart
      .addItem(productId)
      .pipe(
        finalize(() => {
          if (this.cartStatuses()[productId] === 'adding') this.setCartStatus(productId, 'idle');
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          if (!response.success) {
            this.showToast(response.error ?? 'Не вдалося додати товар у кошик.', true);
            return;
          }
          this.setCartStatus(productId, 'added');
          this.showToast('Додано в кошик', false);
          setTimeout(() => this.setCartStatus(productId, 'idle'), 1200);
        },
        error: () => this.showToast('Не вдалося додати товар у кошик.', true),
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
