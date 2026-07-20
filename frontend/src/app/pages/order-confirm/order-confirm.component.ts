import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subject, catchError, finalize, merge, of, switchMap } from 'rxjs';

import { IconComponent } from '../../components/icon/icon.component';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { OrderDetailDto, OrderLineDto } from '../../models/order.models';
import { extractApiError } from '../../services/auth.service';
import { OrderService } from '../../services/order.service';
import { sanitizeImageUrl } from '../../utils/sanitize-image-url';
import { formatMoney, orderStatusLabel, orderStatusTone } from '../auth/auth.helpers';

@Component({
  selector: 'app-order-confirm',
  imports: [DecimalPipe, IconComponent, NavbarComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-confirm.component.html',
  styles: `
    @keyframes fnConfirmPulse {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.45;
      }
    }
    .fn-oc-sk {
      background: var(--kraft-200);
      animation: fnConfirmPulse 1.3s ease-in-out infinite;
    }
  `,
})
export class OrderConfirmComponent {
  /** Route param `:id` (string from router). */
  readonly id = input.required<string>();
  /** Capability token from place redirect (`?token=`). */
  readonly token = input<string | undefined>();

  private readonly orders = inject(OrderService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly retry$ = new Subject<void>();

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly order = signal<OrderDetailDto | null>(null);

  protected readonly statusLabel = computed(() => {
    const o = this.order();
    return o ? orderStatusLabel(o.status) : '';
  });

  protected readonly statusTone = computed(() => {
    const o = this.order();
    return o ? orderStatusTone(o.status) : 'ink';
  });

  protected readonly totalLabel = computed(() => {
    const o = this.order();
    return o ? formatMoney(o.totalAmount) : '';
  });

  constructor() {
    merge(toObservable(this.id), toObservable(this.token), this.retry$)
      .pipe(
        switchMap(() => {
          const numericId = Number(this.id());
          if (!Number.isFinite(numericId) || numericId <= 0) {
            this.loading.set(false);
            this.error.set('Замовлення не знайдено.');
            this.order.set(null);
            return of(null);
          }

          this.loading.set(true);
          this.error.set(null);
          return this.orders.getById(numericId, this.token()).pipe(
            catchError((err: unknown) => {
              this.error.set(extractApiError(err, 'Не вдалося завантажити замовлення.'));
              this.order.set(null);
              return of(null);
            }),
            finalize(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => {
        if (!response) return;
        if (!response.success || !response.data) {
          this.error.set(response.error ?? 'Замовлення не знайдено.');
          this.order.set(null);
          return;
        }
        this.order.set(response.data);
      });
  }

  protected retry(): void {
    this.retry$.next();
  }

  protected lineImage(line: OrderLineDto): string | null {
    return sanitizeImageUrl(line.imageUrl);
  }
}
