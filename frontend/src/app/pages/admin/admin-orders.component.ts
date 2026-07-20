import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AdminOrderDetail, AdminOrderPage, AdminOrderStatus } from '../../models/admin.models';
import { AdminService } from '../../services/admin.service';
import { extractApiError } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin-orders',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap gap-3"><input class="min-w-60 flex-1 rounded-lg border border-[#c2ab80] bg-white px-4 py-2.5" placeholder="Пошук за номером чи клієнтом…" [value]="search()" (input)="search.set($any($event.target).value); reload()" /><select class="rounded-lg border border-[#c2ab80] bg-white px-3 py-2.5" [value]="status()" (change)="status.set($any($event.target).value); reload()"><option value="">Усі статуси</option>@for (value of statuses; track value) { <option [value]="value">{{ label(value) }}</option> }</select></div>
    @if (error()) { <div class="mt-5 rounded-lg bg-[#f5dcd3] p-4">{{ error() }} <button type="button" class="underline" (click)="load()">Спробувати ще</button></div> } @else if (loading()) { <div class="mt-5 h-64 animate-pulse rounded-xl bg-[#f5ecd8]"></div> } @else if (!page().items.length) { <div class="mt-5 rounded-xl border border-[#dac7a2] bg-white p-10 text-center">Замовлень не знайдено.</div> } @else { <div class="mt-5 overflow-hidden rounded-xl border border-[#dac7a2] bg-white"><div class="hidden grid-cols-[90px_105px_1fr_140px_110px_90px_130px] gap-3 border-b bg-[#f5ecd8] px-5 py-3 text-xs font-bold uppercase md:grid"><span>№</span><span>Дата</span><span>Клієнт</span><span>Телефон</span><span>Місто</span><span>Сума</span><span>Статус</span></div>@for (order of page().items; track order.id) { <button type="button" class="grid w-full gap-3 border-b border-[#eadcc0] p-4 text-left hover:bg-[#fbf6ea] md:grid-cols-[90px_105px_1fr_140px_110px_90px_130px] md:items-center md:px-5" (click)="open(order.id)"><span class="font-bold">{{ order.orderNumber }}</span><span class="text-sm">{{ order.createdAt | date:'dd.MM.yyyy' }}</span><span class="truncate font-semibold">{{ order.recipientName }}</span><span class="text-sm">{{ order.phone }}</span><span class="text-sm">{{ order.city }}</span><span class="font-bold">{{ order.totalAmount }} ₴</span><span class="justify-self-start rounded-full px-2 py-1 text-xs font-bold" [class]="badgeClass(order.status)">{{ label(order.status) }}</span></button> }</div><div class="mt-4 flex items-center justify-between text-sm text-[#6a4425]"><span>Показано {{ first() }}–{{ last() }} з {{ page().totalCount }}</span><div class="flex gap-2"><button type="button" class="rounded border px-3 py-1 disabled:opacity-40" [disabled]="page().page <= 1" (click)="changePage(-1)">‹</button><button type="button" class="rounded border px-3 py-1 disabled:opacity-40" [disabled]="page().page >= page().totalPages" (click)="changePage(1)">›</button></div></div> }
    @if (detail()) { <div class="fixed inset-0 z-40 bg-[#2a1a0d]/45" (click)="close()"></div><aside class="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto bg-white shadow-2xl"><header class="flex items-start justify-between border-b p-6"><div><h2 class="text-xl font-black">{{ detail()!.orderNumber }}</h2><p class="text-sm text-[#9c8461]">{{ detail()!.createdAt | date:'dd.MM.yyyy' }}</p></div><button type="button" aria-label="Закрити" class="text-xl" (click)="close()">×</button></header><div class="space-y-5 p-6"><span class="rounded-full px-3 py-1 text-sm font-bold" [class]="badgeClass(detail()!.status)">{{ label(detail()!.status) }}</span><section><h3 class="mb-2 text-xs font-bold uppercase text-[#6a4425]">Клієнт</h3><div class="rounded-lg bg-[#f5ecd8] p-4"><p class="font-bold">{{ detail()!.recipientName }}</p><p>{{ detail()!.phone }}</p><p>{{ detail()!.email }}</p><p>{{ detail()!.deliveryAddress }}</p></div></section><section><h3 class="mb-2 text-xs font-bold uppercase text-[#6a4425]">Склад замовлення</h3>@for (item of detail()!.items; track item.productId) { <div class="flex justify-between border-b py-3"><div><p class="font-semibold">{{ item.productName }}</p><p class="text-sm text-[#9c8461]">{{ item.quantity }} × {{ item.unitPrice }} ₴</p></div><strong>{{ item.lineTotal }} ₴</strong></div> }<div class="mt-4 flex justify-between text-lg font-black"><span>Разом</span><span>{{ detail()!.totalAmount }} ₴</span></div></section><label class="block font-bold">Змінити статус<select class="mt-2 w-full rounded-lg border border-[#c2ab80] p-3 font-normal" [value]="detail()!.status" (change)="changeStatus($any($event.target).value)" [disabled]="updating()">@for (item of allowedStatuses(); track item) { <option [value]="item">{{ label(item) }}</option> }</select></label></div><footer class="sticky bottom-0 border-t bg-white p-5"><button type="button" class="w-full rounded-lg border border-[#c2ab80] py-3 font-bold" (click)="close()">Закрити</button></footer></aside> }
  `,
})
export class AdminOrdersComponent {
  private readonly admin = inject(AdminService); private readonly toast = inject(ToastService); private readonly destroyRef = inject(DestroyRef);
  readonly statuses: AdminOrderStatus[] = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];
  readonly search = signal(''); readonly status = signal(''); readonly loading = signal(true); readonly error = signal(''); readonly updating = signal(false);
  readonly page = signal<AdminOrderPage>({ items: [], page: 1, pageSize: 10, totalCount: 0, totalPages: 1 }); readonly detail = signal<AdminOrderDetail | null>(null);
  readonly first = () => this.page().totalCount ? (this.page().page - 1) * this.page().pageSize + 1 : 0;
  readonly last = () => Math.min(this.page().page * this.page().pageSize, this.page().totalCount);
  constructor() { this.load(); }
  label(status: AdminOrderStatus): string { return ({ Pending: 'Новий', Confirmed: 'В обробці', Shipped: 'Відправлено', Delivered: 'Доставлено', Cancelled: 'Скасовано' })[status]; }
  badgeClass(status: AdminOrderStatus): string { return status === 'Cancelled' ? 'bg-[#f5dcd3] text-[#8a2a20]' : status === 'Pending' ? 'bg-[#eadcc0] text-[#4e301a]' : status === 'Confirmed' ? 'bg-[#fdeeb0] text-[#7a3e18]' : 'bg-[#e4ebcf] text-[#3e5626]'; }
  allowedStatuses(): AdminOrderStatus[] { const current = this.detail()?.status; if (current === 'Pending') return ['Pending', 'Confirmed', 'Cancelled']; if (current === 'Confirmed') return ['Confirmed', 'Shipped', 'Cancelled']; if (current === 'Shipped') return ['Shipped', 'Delivered', 'Cancelled']; return current ? [current] : []; }
  reload(): void { this.page.update(value => ({ ...value, page: 1 })); this.load(); }
  changePage(delta: number): void { this.page.update(value => ({ ...value, page: value.page + delta })); this.load(); }
  load(): void { this.loading.set(true); this.error.set(''); this.admin.getOrders({ search: this.search(), status: this.status(), page: this.page().page, pageSize: this.page().pageSize }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: response => { if (response.success) this.page.set(response.data); else this.error.set(response.error ?? 'Не вдалося завантажити замовлення'); this.loading.set(false); }, error: error => { this.error.set(extractApiError(error, 'Не вдалося завантажити замовлення')); this.loading.set(false); } }); }
  open(id: number): void { this.admin.getOrder(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: response => { if (response.success) this.detail.set(response.data); else this.toast.error(response.error ?? 'Не вдалося завантажити замовлення'); }, error: error => this.toast.error(extractApiError(error, 'Не вдалося завантажити замовлення')) }); }
  close(): void { this.detail.set(null); }
  changeStatus(status: AdminOrderStatus): void {
    const order = this.detail();
    if (!order || status === order.status || this.updating()) return;
    this.updating.set(true);
    this.admin.updateOrderStatus(order.id, status).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        this.updating.set(false);
        if (response.success) {
          this.detail.set(response.data);
          this.page.update(value => ({
            ...value,
            items: value.items.map(item =>
              item.id === order.id
                ? { ...item, status: response.data.status }
                : item),
          }));
          this.toast.success('Статус оновлено');
        } else {
          this.toast.error(response.error ?? 'Не вдалося оновити статус');
        }
      },
      error: error => {
        this.updating.set(false);
        this.toast.error(extractApiError(error, 'Не вдалося оновити статус'));
      },
    });
  }
}
