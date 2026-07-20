import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AdminProduct, AdminProductPage } from '../../models/admin.models';
import { AdminService } from '../../services/admin.service';
import { extractApiError } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { sanitizeImageUrl } from '../../utils/sanitize-image-url';

@Component({
  selector: 'app-admin-products',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap gap-3">
      <input class="min-w-52 flex-1 rounded-lg border border-[#c2ab80] bg-white px-4 py-2.5 outline-none focus:border-[#e4a600]" placeholder="Пошук товару…" [value]="search()" (input)="search.set($any($event.target).value); reload()" />
      <select class="rounded-lg border border-[#c2ab80] bg-white px-3 py-2.5" [value]="category()" (change)="category.set($any($event.target).value); reload()">
        <option value="">Усі категорії</option>
        @for (item of categories(); track item.id) { <option [value]="item.slug">{{ item.name }}</option> }
      </select>
      <a routerLink="/admin/products/new" class="rounded-lg bg-[#f5b800] px-4 py-2.5 font-bold text-[#2a1a0d]">+ Додати товар</a>
    </div>
    @if (error()) {
      <div class="mt-5 rounded-lg border border-[#b23a2e] bg-[#f5dcd3] p-4"> {{ error() }} <button type="button" class="ml-2 underline" (click)="load()">Спробувати ще</button></div>
    } @else if (loading()) {
      <div class="mt-5 h-64 animate-pulse rounded-xl bg-[#f5ecd8]"></div>
    } @else if (page().items.length === 0) {
      <div class="mt-5 rounded-xl border border-[#dac7a2] bg-white p-10 text-center">Товарів не знайдено. <a routerLink="/admin/products/new" class="font-bold underline">Додати товар</a></div>
    } @else {
      <div class="mt-5 overflow-hidden rounded-xl border border-[#dac7a2] bg-white">
        <div class="hidden grid-cols-[64px_1fr_130px_100px_90px_140px_85px] gap-3 border-b border-[#dac7a2] bg-[#f5ecd8] px-5 py-3 text-xs font-bold uppercase tracking-wide text-[#4e301a] md:grid"><span></span><span>Назва</span><span>Категорія</span><span>Ціна</span><span>Залишок</span><span>Статус</span><span>Дії</span></div>
        @for (product of page().items; track product.id) {
          <article class="grid gap-3 border-b border-[#eadcc0] p-4 last:border-0 md:grid-cols-[64px_1fr_130px_100px_90px_140px_85px] md:items-center md:px-5">
            <div class="grid h-12 w-12 place-items-center overflow-hidden rounded bg-[#f5ecd8] text-xs text-[#9c8461]">@if (previewUrl(product.imageUrl); as src) { <img [src]="src" [alt]="product.name" class="h-full w-full object-cover" /> } @else { фото }</div>
            <div class="min-w-0"><p class="truncate font-bold">{{ product.name }}</p><p class="truncate text-xs text-[#9c8461]">{{ product.slug }}</p></div>
            <p class="text-sm text-[#4e301a]">{{ product.categoryName }}</p><p class="font-bold">{{ product.price }} ₴</p>
            <p [class]="product.stockQuantity === 0 ? 'font-bold text-[#b23a2e]' : product.stockQuantity < 10 ? 'font-bold text-[#7a3e18]' : 'font-bold text-[#3e5626]'">{{ product.stockQuantity }}</p>
            <button type="button" class="justify-self-start text-sm font-bold" [class.text-[#3e5626]]="product.isActive" [class.text-[#9c8461]]="!product.isActive" (click)="toggleActive(product)" [attr.aria-label]="'Змінити статус товару ' + product.name">{{ product.isActive ? '● Активний' : '○ Прихований' }}</button>
            <div class="flex gap-2"><a [routerLink]="['/admin/products', product.id, 'edit']" class="rounded border border-[#c2ab80] px-2 py-1 text-sm" [attr.aria-label]="'Редагувати ' + product.name">Ред.</a><button type="button" class="rounded border border-[#b23a2e] px-2 py-1 text-sm text-[#b23a2e]" [attr.aria-label]="'Видалити ' + product.name" (click)="delete(product)">×</button></div>
          </article>
        }
      </div>
      <div class="mt-4 flex items-center justify-between text-sm text-[#6a4425]"><span>Показано {{ first() }}–{{ last() }} з {{ page().totalCount }}</span><div class="flex gap-2"><button type="button" class="rounded border px-3 py-1 disabled:opacity-40" [disabled]="page().page <= 1" (click)="changePage(-1)">‹</button><button type="button" class="rounded border px-3 py-1 disabled:opacity-40" [disabled]="page().page >= page().totalPages" (click)="changePage(1)">›</button></div></div>
    }
  `,
})
export class AdminProductsComponent {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  readonly search = signal('');
  readonly category = signal('');
  readonly categories = signal<{ id: number; name: string; slug: string }[]>([]);
  readonly page = signal<AdminProductPage>({ items: [], page: 1, pageSize: 10, totalCount: 0, totalPages: 1 });
  readonly loading = signal(true);
  readonly error = signal('');
  readonly togglingId = signal<number | null>(null);
  readonly first = () => this.page().totalCount ? (this.page().page - 1) * this.page().pageSize + 1 : 0;
  readonly last = () => Math.min(this.page().page * this.page().pageSize, this.page().totalCount);

  constructor() { this.load(); this.admin.getCategories().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(response => { if (response.success) this.categories.set(response.data); }); }
  reload(): void { this.page.update(value => ({ ...value, page: 1 })); this.load(); }
  load(): void {
    this.loading.set(true); this.error.set('');
    this.admin.getProducts({ search: this.search(), category: this.category(), page: this.page().page, pageSize: this.page().pageSize }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: response => { if (response.success) this.page.set(response.data); else this.error.set(response.error ?? 'Не вдалося завантажити товари'); this.loading.set(false); }, error: error => { this.error.set(extractApiError(error, 'Не вдалося завантажити товари')); this.loading.set(false); } });
  }
  changePage(delta: number): void { this.page.update(value => ({ ...value, page: value.page + delta })); this.load(); }
  previewUrl(url: string | null | undefined): string | null { return sanitizeImageUrl(url); }
  toggleActive(product: AdminProduct): void {
    if (this.togglingId() !== null) return;
    this.togglingId.set(product.id);
    this.admin.setProductActive(product.id, !product.isActive).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        this.togglingId.set(null);
        if (response.success) {
          this.page.update(value => ({
            ...value,
            items: value.items.map(item => item.id === product.id ? { ...item, isActive: response.data.isActive } : item),
          }));
        } else {
          this.toast.error(response.error ?? 'Не вдалося змінити статус');
        }
      },
      error: error => {
        this.togglingId.set(null);
        this.toast.error(extractApiError(error, 'Не вдалося змінити статус'));
      },
    });
  }
  delete(product: AdminProduct): void { if (!confirm(`Видалити товар «${product.name}»?`)) return; this.admin.deleteProduct(product.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: response => { if (response.success) { this.toast.success('Товар видалено'); this.load(); } else this.toast.error(response.error ?? 'Не вдалося видалити товар'); }, error: error => this.toast.error(extractApiError(error, 'Не вдалося видалити товар')) }); }
}
