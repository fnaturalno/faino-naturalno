import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { AdminOrderDetail, AdminOrderPage, AdminOrderStatus } from '../../models/admin.models';
import { AdminService } from '../../services/admin.service';
import { extractApiError } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin-orders',
  imports: [DatePipe, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-orders.component.html',
  styleUrl: './admin-orders.component.css',
})
export class AdminOrdersComponent {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);

  readonly statuses: AdminOrderStatus[] = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];
  readonly search = signal('');
  readonly status = signal('');
  readonly loading = signal(true);
  readonly error = signal('');
  readonly updating = signal(false);
  readonly page = signal<AdminOrderPage>({ items: [], page: 1, pageSize: 10, totalCount: 0, totalPages: 1 });
  readonly detail = signal<AdminOrderDetail | null>(null);
  readonly first = () => (this.page().totalCount ? (this.page().page - 1) * this.page().pageSize + 1 : 0);
  readonly last = () => Math.min(this.page().page * this.page().pageSize, this.page().totalCount);

  constructor() {
    this.load();
  }

  label(status: AdminOrderStatus): string {
    const keys: Record<AdminOrderStatus, string> = {
      Pending: 'admin.statusNew',
      Confirmed: 'admin.statusConfirmed',
      Shipped: 'admin.statusShipped',
      Delivered: 'admin.statusDelivered',
      Cancelled: 'admin.statusCancelled',
    };
    return this.i18n.translate(keys[status]);
  }

  deliveryMethodLabel(method: string): string {
    switch (method) {
      case 'pickup':
        return this.i18n.translate('order.methodPickup');
      case 'ukrposhta':
        return this.i18n.translate('order.methodUkrposhta');
      case 'city':
        return this.i18n.translate('order.methodCity');
      default:
        return this.i18n.translate('order.methodNovaPoshta');
    }
  }

  badgeClass(status: AdminOrderStatus): string {
    return status === 'Cancelled'
      ? 'bg-[#f5dcd3] text-[#8a2a20]'
      : status === 'Pending'
        ? 'bg-[#eadcc0] text-[#4e301a]'
        : status === 'Confirmed'
          ? 'bg-[#fdeeb0] text-[#7a3e18]'
          : 'bg-[#e4ebcf] text-[#3e5626]';
  }

  allowedStatuses(): AdminOrderStatus[] {
    const current = this.detail()?.status;
    if (current === 'Pending') return ['Pending', 'Confirmed', 'Cancelled'];
    if (current === 'Confirmed') return ['Confirmed', 'Shipped', 'Cancelled'];
    if (current === 'Shipped') return ['Shipped', 'Delivered', 'Cancelled'];
    return current ? [current] : [];
  }

  reload(): void {
    this.page.update((value) => ({ ...value, page: 1 }));
    this.load();
  }

  changePage(delta: number): void {
    this.page.update((value) => ({ ...value, page: value.page + delta }));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.admin
      .getOrders({
        search: this.search(),
        status: this.status(),
        page: this.page().page,
        pageSize: this.page().pageSize,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success) this.page.set(response.data);
          else this.error.set(response.error ?? this.i18n.translate('admin.loadOrdersError'));
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(extractApiError(error, this.i18n.translate('admin.loadOrdersError')));
          this.loading.set(false);
        },
      });
  }

  open(id: number): void {
    this.admin
      .getOrder(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success) this.detail.set(response.data);
          else this.toast.error(response.error ?? this.i18n.translate('admin.loadOrdersError'));
        },
        error: (error) =>
          this.toast.error(extractApiError(error, this.i18n.translate('admin.loadOrdersError'))),
      });
  }

  close(): void {
    this.detail.set(null);
  }

  changeStatus(status: AdminOrderStatus): void {
    const order = this.detail();
    if (!order || status === order.status || this.updating()) return;
    this.updating.set(true);
    this.admin
      .updateOrderStatus(order.id, status)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.updating.set(false);
          if (response.success) {
            this.detail.set(response.data);
            this.page.update((value) => ({
              ...value,
              items: value.items.map((item) =>
                item.id === order.id ? { ...item, status: response.data.status } : item,
              ),
            }));
            this.toast.success(this.i18n.translate('admin.orderUpdated'));
          } else {
            this.toast.error(response.error ?? this.i18n.translate('admin.updateOrderError'));
          }
        },
        error: (error) => {
          this.updating.set(false);
          this.toast.error(extractApiError(error, this.i18n.translate('admin.updateOrderError')));
        },
      });
  }
}
