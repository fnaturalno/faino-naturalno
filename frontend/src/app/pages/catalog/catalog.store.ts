import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
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

import {
  CatalogFilters,
  CatalogSort,
  CategorySummary,
  ProductPage,
} from '../../models/catalog.models';
import { CategoryService } from '../../services/category.service';
import { ProductService } from '../../services/product.service';

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
  private readonly loadRequests = new Subject<CatalogFilters>();
  private readonly priceRequests = new Subject<Pick<CatalogFilters, 'minPrice' | 'maxPrice'>>();
  private readonly previewRequests = new Subject<CatalogFilters>();
  private priceDraft: Pick<CatalogFilters, 'minPrice' | 'maxPrice'> = {
    minPrice: null,
    maxPrice: null,
  };

  private readonly filtersState = signal<CatalogFilters>(DEFAULT_FILTERS);
  private readonly categoriesState = signal<CategorySummary[]>([]);
  private readonly pageState = signal<ProductPage | null>(null);
  private readonly initialLoadingState = signal(true);
  private readonly refetchingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly categoryErrorState = signal(false);
  private readonly previewCountState = signal<number | null>(null);

  readonly filters = this.filtersState.asReadonly();
  readonly categories = this.categoriesState.asReadonly();
  readonly page = this.pageState.asReadonly();
  readonly initialLoading = this.initialLoadingState.asReadonly();
  readonly refetching = this.refetchingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly categoryError = this.categoryErrorState.asReadonly();
  readonly previewCount = this.previewCountState.asReadonly();

  constructor() {
    this.bindProductRequests();
    this.bindPriceRequests();
    this.bindPreviewRequests();
    this.bindUrl();
    this.loadCategories();
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

  updatePage(page: number): void {
    this.navigate({ ...this.filtersState(), page: Math.max(1, page) });
  }

  reset(): void {
    this.navigate(DEFAULT_FILTERS);
  }

  retry(): void {
    this.loadRequests.next(this.filtersState());
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
          const requestedPage = Number(params.get('page'));
          const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
          const filters = { categories: [...new Set(categories)], minPrice, maxPrice, sortBy, page };
          const requiresNormalization =
            (params.has('sortBy') && (!requestedSort || !SORTS.has(requestedSort) || sortBy === 'popular')) ||
            (params.has('page') && (page === 1 || String(page) !== params.get('page'))) ||
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
        this.filtersState.set(filters);
        this.loadRequests.next(filters);
      });
  }

  private bindProductRequests(): void {
    this.loadRequests
      .pipe(
        tap(() => {
          this.errorState.set(null);
          this.pageState() ? this.refetchingState.set(true) : this.initialLoadingState.set(true);
        }),
        switchMap((filters) =>
          this.productsApi.getProducts(filters).pipe(
            map((response) => {
              if (!response.success) {
                throw new Error(response.error ?? 'Не вдалося завантажити товари.');
              }
              return response.data;
            }),
            catchError(() => {
              this.errorState.set('Не вдалося завантажити товари. Перевірте з’єднання та спробуйте ще.');
              this.initialLoadingState.set(false);
              this.refetchingState.set(false);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => {
        this.pageState.set(page);
        this.initialLoadingState.set(false);
        this.refetchingState.set(false);
        if (page.page !== this.filtersState().page) {
          this.navigate({ ...this.filtersState(), page: page.page }, true);
        }
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
        const validSlugs = new Set(categories.map((category) => category.slug));
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
        page: filters.page === 1 ? null : filters.page,
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
