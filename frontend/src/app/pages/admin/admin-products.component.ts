import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { IconComponent } from '../../components/icon/icon.component';
import { AdminCategory, AdminProduct, AdminProductPage } from '../../models/admin.models';
import { AdminService } from '../../services/admin.service';
import { extractApiError } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { sanitizeImageUrl } from '../../utils/sanitize-image-url';

@Component({
  selector: 'app-admin-products',
  imports: [TranslocoPipe, RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './admin-products.component.css',
  templateUrl: './admin-products.component.html',
})
export class AdminProductsComponent {
  private readonly admin = inject(AdminService);
  private readonly i18n = inject(TranslocoService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  readonly search = signal('');
  readonly category = signal('');
  readonly categories = signal<AdminCategory[]>([]);
  readonly page = signal<AdminProductPage>({
    items: [],
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 1,
  });
  readonly loading = signal(true);
  readonly error = signal('');
  readonly togglingId = signal<number | null>(null);
  private readonly failedImageIds = signal(new Set<number>());
  protected readonly tableCols = '64px minmax(0, 1fr) 120px 90px 120px 110px 100px';

  readonly products = computed(() => this.page().items ?? []);

  readonly first = computed(() =>
    this.page().totalCount ? (this.page().page - 1) * this.page().pageSize + 1 : 0,
  );
  readonly last = computed(() =>
    Math.min(this.page().page * this.page().pageSize, this.page().totalCount),
  );
  readonly pageNumbers = computed(() => {
    const total = Math.max(this.page().totalPages, 1);
    const current = this.page().page;
    const window = 5;
    let start = Math.max(1, current - Math.floor(window / 2));
    let end = Math.min(total, start + window - 1);
    start = Math.max(1, end - window + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  constructor() {
    this.load();
    this.admin
      .getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        if (response.success) this.categories.set(response.data);
      });
  }

  onSearch(value: string): void {
    this.search.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.reload(), 300);
  }

  reload(): void {
    this.page.update((value) => ({ ...value, page: 1 }));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.admin
      .getProducts({
        search: this.search(),
        category: this.category(),
        page: this.page().page,
        pageSize: this.page().pageSize,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const data = response.data;
            const items = Array.isArray(data.items) ? data.items : [];
            this.page.set({
              items,
              page: data.page ?? 1,
              pageSize: data.pageSize ?? 10,
              totalCount: data.totalCount ?? items.length,
              totalPages: Math.max(data.totalPages ?? 1, 1),
            });
          } else {
            this.error.set(response.error ?? this.i18n.translate('admin.loadProductsError'));
          }
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(extractApiError(error, this.i18n.translate('admin.loadProductsError')));
          this.loading.set(false);
        },
      });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.page().totalPages || page === this.page().page) return;
    this.page.update((value) => ({ ...value, page }));
    this.load();
  }

  previewUrl(url: string | null | undefined): string | null {
    return sanitizeImageUrl(url);
  }

  thumbUrl(product: AdminProduct): string | null {
    if (this.failedImageIds().has(product.id)) return null;
    return sanitizeImageUrl(product.imageUrl);
  }

  markImageFailed(productId: number): void {
    this.failedImageIds.update((ids) => {
      const next = new Set(ids);
      next.add(productId);
      return next;
    });
  }

  toggleActive(product: AdminProduct): void {
    if (this.togglingId() !== null) return;
    this.togglingId.set(product.id);
    this.admin
      .setProductActive(product.id, !product.isActive)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.togglingId.set(null);
          if (response.success) {
            this.page.update((value) => ({
              ...value,
              items: value.items.map((item) =>
                item.id === product.id ? { ...item, isActive: response.data.isActive } : item,
              ),
            }));
          } else {
            this.toast.error(response.error ?? this.i18n.translate('admin.toggleActiveError'));
          }
        },
        error: (error) => {
          this.togglingId.set(null);
          this.toast.error(extractApiError(error, this.i18n.translate('admin.toggleActiveError')));
        },
      });
  }

  toggleAvailable(product: AdminProduct): void {
    if (this.togglingId() !== null) return;
    const next = product.isAvailable === false;
    this.togglingId.set(product.id);
    this.admin
      .setProductAvailable(product.id, next)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.togglingId.set(null);
          if (response.success) {
            this.page.update((value) => ({
              ...value,
              items: value.items.map((item) =>
                item.id === product.id
                  ? { ...item, isAvailable: response.data.isAvailable }
                  : item,
              ),
            }));
          } else {
            this.toast.error(response.error ?? this.i18n.translate('admin.toggleAvailableError'));
          }
        },
        error: (error) => {
          this.togglingId.set(null);
          this.toast.error(extractApiError(error, this.i18n.translate('admin.toggleAvailableError')));
        },
      });
  }

  delete(product: AdminProduct): void {
    if (!confirm(this.i18n.translate('admin.confirmDeleteProduct', { name: product.name }))) return;
    this.admin
      .deleteProduct(product.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toast.success(this.i18n.translate('admin.productDeleted'));
            this.load();
          } else {
            this.toast.error(response.error ?? this.i18n.translate('admin.deleteProductError'));
          }
        },
        error: (error) => this.toast.error(extractApiError(error, this.i18n.translate('admin.deleteProductError'))),
      });
  }
}
