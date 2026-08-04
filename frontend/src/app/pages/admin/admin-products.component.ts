import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
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
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .ad-act {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 8px;
      border: 1.5px solid var(--border-subtle);
      background: white;
      color: var(--espresso-700);
      transition:
        border-color 0.15s ease,
        color 0.15s ease;
    }
    .ad-act:hover {
      border-color: var(--border-strong);
    }
    .ad-act.danger:hover {
      color: var(--chili-500);
      border-color: var(--chili-500);
    }
    .ad-row:hover {
      background: var(--kraft-100);
    }
  `,
  template: `
    <div class="mb-5 flex flex-wrap items-center gap-3">
      <div class="relative min-w-[200px] max-w-[340px] flex-1">
        <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--kraft-500)]">
          <app-icon name="search" [size]="16" />
        </span>
        <input
          type="search"
          class="w-full rounded-[10px] border border-[var(--border-strong)] bg-white py-2.5 pl-10 pr-3.5 text-sm text-[var(--espresso-800)] outline-none focus:border-[var(--marigold-500)]"
          placeholder="Пошук товару…"
          [value]="search()"
          (input)="onSearch($any($event.target).value)"
        />
      </div>

      <div class="relative">
        <select
          class="appearance-none rounded-[10px] border border-[var(--border-strong)] bg-white py-2.5 pl-3.5 pr-9 text-sm font-semibold text-[var(--espresso-800)] outline-none focus:border-[var(--marigold-500)]"
          [value]="category()"
          (change)="category.set($any($event.target).value); reload()"
        >
          <option value="">Усі категорії</option>
          @for (item of categories(); track item.id) {
            <option [value]="item.slug">{{ item.name }}</option>
            @for (child of item.children; track child.id) {
              <option [value]="child.slug">↳ {{ child.name }}</option>
            }
          }
        </select>
        <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--espresso-700)]">
          <app-icon name="chevron-down" [size]="15" />
        </span>
      </div>

      <a
        routerLink="/admin/products/new"
        class="ml-auto rounded-[10px] bg-[var(--marigold-400)] px-4 py-2.5 font-bold text-[var(--espresso-900)] hover:bg-[var(--marigold-500)]"
      >
        + Додати товар
      </a>
    </div>

    @if (error()) {
      <div class="rounded-[10px] border border-[var(--chili-500)] bg-[var(--chili-100)] p-4 text-[var(--espresso-800)]">
        {{ error() }}
        <button type="button" class="ml-2 underline" (click)="load()">Спробувати ще</button>
      </div>
    } @else if (loading()) {
      <div class="h-72 animate-pulse rounded-[14px] bg-[var(--kraft-100)]"></div>
    } @else if (products().length === 0) {
      <div class="rounded-[14px] border border-[var(--border-subtle)] bg-white p-10 text-center shadow-sm">
        Товарів не знайдено.
        <a routerLink="/admin/products/new" class="font-bold text-[var(--cinnamon-700)] underline">Додати товар</a>
      </div>
    } @else {
      <!-- Desktop / tablet table -->
      <div
        class="hidden overflow-hidden rounded-[14px] border border-[var(--border-subtle)] bg-white shadow-[0_1px_2px_rgba(42,26,13,0.04)] md:block"
      >
        <div
          class="grid gap-3 border-b border-[var(--border-subtle)] bg-[var(--kraft-100)] px-5 py-3.5"
          [style.grid-template-columns]="tableCols"
        >
          <span class="fn-eyebrow text-[10px]"></span>
          <span class="fn-eyebrow text-[10px]">Назва</span>
          <span class="fn-eyebrow text-[10px]">Категорія</span>
          <span class="fn-eyebrow text-[10px]">Ціна</span>
          <span class="fn-eyebrow text-[10px]">Залишок</span>
          <span class="fn-eyebrow text-[10px]">Статус</span>
          <span class="fn-eyebrow text-right text-[10px]">Дії</span>
        </div>

        @for (product of products(); track product.id) {
          <div
            class="ad-row grid min-h-14 items-center gap-3 border-b border-[var(--border-subtle)] bg-white px-5 py-3 last:border-0"
            [style.grid-template-columns]="tableCols"
          >
            <div
              class="grid size-12 place-items-center overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--kraft-100)] text-[10px] text-[var(--kraft-400)]"
            >
              @if (thumbUrl(product); as src) {
                <img
                  [src]="src"
                  [alt]="product.name"
                  class="h-full w-full object-cover"
                  (error)="markImageFailed(product.id)"
                />
              } @else {
                фото
              }
            </div>

            <div class="min-w-0">
              <p class="truncate text-sm font-bold leading-tight text-[var(--espresso-900)]" [title]="product.name">
                {{ product.name }}
              </p>
              <p class="truncate text-xs text-[var(--text-muted)]" [title]="product.slug">{{ product.slug }}</p>
            </div>

            <span class="truncate text-sm text-[var(--espresso-700)]" [title]="product.categoryName">{{
              product.categoryName
            }}</span>
            <span class="text-base font-bold text-[var(--espresso-900)]">{{ product.price }} ₴</span>
            <span class="text-sm font-semibold" [class]="stockClass(product.stockQuantity)">{{
              product.stockQuantity
            }}</span>

            <button
              type="button"
              class="inline-flex items-center gap-2 justify-self-start bg-transparent p-0"
              [attr.aria-label]="'Змінити статус товару ' + product.name"
              [disabled]="togglingId() === product.id"
              (click)="toggleActive(product)"
            >
              <span
                class="relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors"
                [class.bg-[var(--garden-500)]]="product.isActive"
                [class.bg-[var(--kraft-300)]]="!product.isActive"
              >
                <span
                  class="absolute top-0.5 size-[18px] rounded-full bg-white shadow transition-[left] duration-150"
                  [style.left.px]="product.isActive ? 18 : 2"
                ></span>
              </span>
              <span
                class="text-xs font-semibold"
                [class.text-[var(--garden-700)]]="product.isActive"
                [class.text-[var(--text-muted)]]="!product.isActive"
              >
                {{ product.isActive ? 'Активний' : 'Прихований' }}
              </span>
            </button>

            <div class="flex justify-end gap-2">
              <a
                [routerLink]="['/admin/products', product.id, 'edit']"
                class="ad-act"
                [attr.aria-label]="'Редагувати ' + product.name"
              >
                <app-icon name="pencil" [size]="15" />
              </a>
              <button
                type="button"
                class="ad-act danger"
                [attr.aria-label]="'Видалити ' + product.name"
                (click)="delete(product)"
              >
                <app-icon name="trash" [size]="15" />
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Mobile cards -->
      <div class="flex flex-col gap-2.5 md:hidden">
        @for (product of products(); track product.id) {
          <article
            class="flex items-center gap-3 rounded-[10px] border border-[var(--border-subtle)] bg-white p-3 shadow-sm"
          >
            <div
              class="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--kraft-100)] text-[10px] text-[var(--kraft-400)]"
            >
              @if (thumbUrl(product); as src) {
                <img
                  [src]="src"
                  [alt]="product.name"
                  class="h-full w-full object-cover"
                  (error)="markImageFailed(product.id)"
                />
              } @else {
                фото
              }
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-bold text-[var(--espresso-900)]">{{ product.name }}</p>
              <p class="text-xs text-[var(--text-muted)]">
                {{ product.categoryName }} · {{ product.price }} ₴
              </p>
            </div>
            <button
              type="button"
              class="shrink-0"
              [attr.aria-label]="'Змінити статус товару ' + product.name"
              [disabled]="togglingId() === product.id"
              (click)="toggleActive(product)"
            >
              <span
                class="relative block h-5 w-[34px] rounded-full"
                [class.bg-[var(--garden-500)]]="product.isActive"
                [class.bg-[var(--kraft-300)]]="!product.isActive"
              >
                <span
                  class="absolute top-0.5 size-4 rounded-full bg-white shadow transition-[left] duration-150"
                  [style.left.px]="product.isActive ? 16 : 2"
                ></span>
              </span>
            </button>
            <a
              [routerLink]="['/admin/products', product.id, 'edit']"
              class="ad-act shrink-0"
              [attr.aria-label]="'Редагувати ' + product.name"
            >
              <app-icon name="pencil" [size]="15" />
            </a>
          </article>
        }
      </div>

      <div class="mt-[18px] flex flex-wrap items-center justify-between gap-3">
        <span class="text-sm text-[var(--text-muted)]"
          >Показано {{ first() }}–{{ last() }} з {{ page().totalCount }}</span
        >
        <div class="flex gap-1.5">
          <button
            type="button"
            class="grid size-9 place-items-center rounded-lg border border-[var(--border-subtle)] bg-white text-[var(--espresso-700)] disabled:opacity-40"
            [disabled]="page().page <= 1"
            aria-label="Попередня сторінка"
            (click)="goToPage(page().page - 1)"
          >
            <app-icon name="chevron-left" [size]="16" />
          </button>
          @for (n of pageNumbers(); track n) {
            <button
              type="button"
              class="grid size-9 place-items-center rounded-lg border text-sm font-bold"
              [class.border-[var(--espresso-800)]]="n === page().page"
              [class.bg-[var(--espresso-800)]]="n === page().page"
              [class.text-[var(--kraft-50)]]="n === page().page"
              [class.border-[var(--border-subtle)]]="n !== page().page"
              [class.bg-white]="n !== page().page"
              [class.text-[var(--espresso-800)]]="n !== page().page"
              (click)="goToPage(n)"
            >
              {{ n }}
            </button>
          }
          <button
            type="button"
            class="grid size-9 place-items-center rounded-lg border border-[var(--border-subtle)] bg-white text-[var(--espresso-700)] disabled:opacity-40"
            [disabled]="page().page >= page().totalPages"
            aria-label="Наступна сторінка"
            (click)="goToPage(page().page + 1)"
          >
            <app-icon name="chevron-right" [size]="16" />
          </button>
        </div>
      </div>
    }
  `,
})
export class AdminProductsComponent {
  private readonly admin = inject(AdminService);
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
  protected readonly tableCols = '64px minmax(0, 1fr) 130px 100px 90px 130px 100px';

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
            this.error.set(response.error ?? 'Не вдалося завантажити товари');
          }
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(extractApiError(error, 'Не вдалося завантажити товари'));
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

  stockClass(stock: number): string {
    if (stock === 0) return 'text-[var(--chili-500)]';
    if (stock < 10) return 'text-[var(--cinnamon-700)]';
    return 'text-[var(--garden-700)]';
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
            this.toast.error(response.error ?? 'Не вдалося змінити статус');
          }
        },
        error: (error) => {
          this.togglingId.set(null);
          this.toast.error(extractApiError(error, 'Не вдалося змінити статус'));
        },
      });
  }

  delete(product: AdminProduct): void {
    if (!confirm(`Видалити товар «${product.name}»?`)) return;
    this.admin
      .deleteProduct(product.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toast.success('Товар видалено');
            this.load();
          } else {
            this.toast.error(response.error ?? 'Не вдалося видалити товар');
          }
        },
        error: (error) => this.toast.error(extractApiError(error, 'Не вдалося видалити товар')),
      });
  }
}
