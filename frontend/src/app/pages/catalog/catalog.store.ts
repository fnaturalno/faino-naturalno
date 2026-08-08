import { DestroyRef, computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import {
  catchError,
  debounceTime,
  EMPTY,
  map,
  of,
  Subject,
  switchMap,
  tap,
} from 'rxjs';

import { LocaleService } from '../../i18n/locale.service';
import {
  CatalogFilters,
  CatalogProduct,
  CatalogSort,
  CategorySummary,
  ProductPage,
} from '../../models/catalog.models';
import { CategoryService } from '../../services/category.service';
import { ProductService } from '../../services/product.service';

export const CATALOG_PAGE_SIZE = 15;

const DEFAULT_FILTERS: CatalogFilters = {
  categories: [],
  minPrice: null,
  maxPrice: null,
  sortBy: 'popular',
  page: 1,
};
const SORTS = new Set<CatalogSort>(['popular', 'price-asc', 'price-desc', 'new']);

@Injectable()
export class CatalogStore {
  private readonly productsApi = inject(ProductService);
  private readonly categoriesApi = inject(CategoryService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject(TranslocoService);
  private readonly locale = inject(LocaleService);
  private readonly loadRequests = new Subject<{ filters: CatalogFilters; append: boolean }>();
  private readonly priceRequests = new Subject<Pick<CatalogFilters, 'minPrice' | 'maxPrice'>>();
  private readonly previewRequests = new Subject<CatalogFilters>();
  private priceDraft: Pick<CatalogFilters, 'minPrice' | 'maxPrice'> = {
    minPrice: null,
    maxPrice: null,
  };

  private readonly filtersState = signal<CatalogFilters>(DEFAULT_FILTERS);
  private readonly categoriesState = signal<CategorySummary[]>([]);
  private readonly pageState = signal<ProductPage | null>(null);
  private readonly itemsState = signal<CatalogProduct[]>([]);
  private readonly initialLoadingState = signal(true);
  private readonly refetchingState = signal(false);
  private readonly loadingMoreState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly categoryErrorState = signal(false);
  private readonly previewCountState = signal<number | null>(null);

  readonly filters = this.filtersState.asReadonly();
  readonly categories = this.categoriesState.asReadonly();
  readonly page = this.pageState.asReadonly();
  readonly items = this.itemsState.asReadonly();
  readonly initialLoading = this.initialLoadingState.asReadonly();
  readonly refetching = this.refetchingState.asReadonly();
  readonly loadingMore = this.loadingMoreState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly categoryError = this.categoryErrorState.asReadonly();
  readonly previewCount = this.previewCountState.asReadonly();
  readonly hasMore = computed(() => {
    const page = this.pageState();
    return !!page && page.page < page.totalPages;
  });

  constructor() {
    this.bindProductRequests();
    this.bindPriceRequests();
    this.bindPreviewRequests();
    this.bindUrl();
    this.loadCategories();

    let firstLocale = true;
    effect(() => {
      this.locale.lang();
      if (firstLocale) {
        firstLocale = false;
        return;
      }
      untracked(() => {
        this.loadCategories();
        this.reload({ ...this.filtersState(), page: 1 });
      });
    });
  }

  updateCategories(categories: string[]): void {
    this.navigate({ ...this.filtersState(), categories, page: 1 });
  }

  updateSort(sortBy: CatalogSort): void {
    this.navigate({ ...this.filtersState(), sortBy, page: 1 });
  }

  queuePrice(kind: 'min' | 'max', value: number | null): void {
    this.priceDraft = {
      ...this.priceDraft,
      [kind === 'min' ? 'minPrice' : 'maxPrice']: value,
    };
    this.priceRequests.next(this.priceDraft);
  }

  /** Load the next batch (append). No-op if already loading or no more pages. */
  loadMore(): void {
    const page = this.pageState();
    if (!page || this.loadingMoreState() || this.refetchingState() || this.initialLoadingState()) {
      return;
    }
    if (page.page >= page.totalPages) {
      return;
    }
    const nextFilters = { ...this.filtersState(), page: page.page + 1 };
    this.filtersState.set(nextFilters);
    this.loadRequests.next({ filters: nextFilters, append: true });
  }

  reset(): void {
    this.navigate(DEFAULT_FILTERS);
  }

  retry(): void {
    this.reload({ ...this.filtersState(), page: 1 });
  }

  preview(filters: CatalogFilters): void {
    this.previewCountState.set(null);
    this.previewRequests.next({ ...filters, page: 1 });
  }

  clearPreview(): void {
    this.previewCountState.set(null);
  }

  applyPending(filters: CatalogFilters): void {
    this.navigate({ ...filters, page: 1 });
  }

  private reload(filters: CatalogFilters): void {
    this.filtersState.set(filters);
    this.loadRequests.next({ filters, append: false });
  }

  private bindUrl(): void {
    this.route.queryParamMap
      .pipe(
        map((params) => {
          const categories = (params.get('category') ?? '')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);
          let minPrice = this.price(params.get('minPrice'));
          let maxPrice = this.price(params.get('maxPrice'));
          if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
            [minPrice, maxPrice] = [maxPrice, minPrice];
          }
          const requestedSort = params.get('sortBy') as CatalogSort | null;
          const sortBy = requestedSort && SORTS.has(requestedSort) ? requestedSort : 'popular';
          const filters: CatalogFilters = {
            categories: [...new Set(categories)],
            minPrice,
            maxPrice,
            sortBy,
            page: 1,
          };
          const requiresNormalization =
            (params.has('sortBy') &&
              (!requestedSort || !SORTS.has(requestedSort) || sortBy === 'popular')) ||
            params.has('page') ||
            (params.has('minPrice') && minPrice === null) ||
            (params.has('maxPrice') && maxPrice === null) ||
            (minPrice !== null &&
              maxPrice !== null &&
              Number(params.get('minPrice')) > Number(params.get('maxPrice')));
          return { filters, requiresNormalization };
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ filters, requiresNormalization }) => {
        if (requiresNormalization) {
          this.navigate(filters, true);
          return;
        }
        this.priceDraft = { minPrice: filters.minPrice, maxPrice: filters.maxPrice };
        this.reload(filters);
      });
  }

  private bindProductRequests(): void {
    this.loadRequests
      .pipe(
        tap(({ append }) => {
          this.errorState.set(null);
          if (append) {
            this.loadingMoreState.set(true);
          } else if (this.itemsState().length) {
            this.refetchingState.set(true);
          } else {
            this.initialLoadingState.set(true);
          }
        }),
        switchMap(({ filters, append }) =>
          this.productsApi.getProducts(filters).pipe(
            map((response) => {
              if (!response.success) {
                throw new Error(response.error ?? this.i18n.translate('catalog.errorLoad'));
              }
              return { page: response.data, append };
            }),
            catchError(() => {
              this.errorState.set(this.i18n.translate('catalog.errorBody'));
              this.initialLoadingState.set(false);
              this.refetchingState.set(false);
              this.loadingMoreState.set(false);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ page, append }) => {
        this.pageState.set(page);
        if (append) {
          const existingIds = new Set(this.itemsState().map((item) => item.id));
          const merged = [
            ...this.itemsState(),
            ...page.items.filter((item) => !existingIds.has(item.id)),
          ];
          this.itemsState.set(merged);
        } else {
          this.itemsState.set(page.items ?? []);
        }
        this.filtersState.update((filters) => ({ ...filters, page: page.page }));
        this.initialLoadingState.set(false);
        this.refetchingState.set(false);
        this.loadingMoreState.set(false);
      });
  }

  private bindPriceRequests(): void {
    this.priceRequests
      .pipe(debounceTime(350), takeUntilDestroyed(this.destroyRef))
      .subscribe(({ minPrice, maxPrice }) => {
        this.navigate({ ...this.filtersState(), minPrice, maxPrice, page: 1 });
      });
  }

  private bindPreviewRequests(): void {
    this.previewRequests
      .pipe(
        debounceTime(250),
        switchMap((filters) =>
          this.productsApi.getProducts(filters).pipe(
            map((response) => (response.success ? response.data.totalCount : null)),
            catchError(() => of(null)),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((count) => this.previewCountState.set(count));
  }

  private loadCategories(): void {
    this.categoriesApi
      .getCategories()
      .pipe(
        catchError(() => {
          this.categoryErrorState.set(true);
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => {
        if (!response.success) {
          this.categoryErrorState.set(true);
          return;
        }
        const categories = [...response.data].sort((a, b) => a.sortOrder - b.sortOrder);
        this.categoriesState.set(categories);
        const validSlugs = new Set(
          categories.flatMap((category) => [
            category.slug,
            ...(category.children ?? []).map((child) => child.slug),
          ]),
        );
        const validSelected = this.filtersState().categories.filter((slug) => validSlugs.has(slug));
        if (validSelected.length !== this.filtersState().categories.length) {
          this.navigate({ ...this.filtersState(), categories: validSelected }, true);
        }
      });
  }

  private navigate(filters: CatalogFilters, replaceUrl = false): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        category: filters.categories.length ? filters.categories.join(',') : null,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        sortBy: filters.sortBy === 'popular' ? null : filters.sortBy,
        page: null,
      },
      replaceUrl,
    });
  }

  private price(value: string | null): number | null {
    if (value === null || value.trim() === '') {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }
}
