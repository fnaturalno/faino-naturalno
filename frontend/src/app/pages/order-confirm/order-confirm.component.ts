import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Subject, catchError, finalize, merge, of, switchMap } from 'rxjs';

import { IconComponent } from '../../components/icon/icon.component';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { LocaleService } from '../../i18n/locale.service';
import { OrderDetailDto, OrderLineDto } from '../../models/order.models';
import { extractApiError } from '../../services/auth.service';
import { OrderService } from '../../services/order.service';
import { sanitizeImageUrl } from '../../utils/sanitize-image-url';
import { orderStatusLabel, orderStatusTone } from '../auth/auth.helpers';

@Component({
  selector: 'app-order-confirm',
  imports: [DecimalPipe, IconComponent, NavbarComponent, RouterLink, TranslocoPipe],
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
  protected readonly locale = inject(LocaleService);
  private readonly i18n = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly retry$ = new Subject<void>();

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly order = signal<OrderDetailDto | null>(null);

  protected readonly statusLabel = computed(() => {
    const o = this.order();
    return o ? orderStatusLabel(o.status, (key) => this.i18n.translate(key)) : '';
  });

  protected readonly statusTone = computed(() => {
    const o = this.order();
    return o ? orderStatusTone(o.status) : 'ink';
  });

  protected readonly totalLabel = computed(() => {
    const o = this.order();
    return o ? this.locale.formatPrice(o.totalAmount) : '';
  });

  protected readonly deliveryMethodLabel = computed(() => {
    const method = this.order()?.deliveryMethod;
    switch (method) {
      case 'pickup':
        return this.i18n.translate('order.methodPickup');
      case 'city':
        return this.i18n.translate('order.methodCity');
      default:
        return this.i18n.translate('order.methodNovaPoshta');
    }
  });

  protected readonly deliveryNoteKey = computed(() => {
    switch (this.order()?.deliveryMethod) {
      case 'pickup':
        return 'order.deliveryPickupNote';
      case 'city':
        return 'order.deliveryCityNote';
      default:
        return 'order.deliveryNpNote';
    }
  });

  constructor() {
    merge(toObservable(this.id), toObservable(this.token), this.retry$)
      .pipe(
        switchMap(() => {
          const numericId = Number(this.id());
          if (!Number.isFinite(numericId) || numericId <= 0) {
            this.loading.set(false);
            this.error.set(this.i18n.translate('order.notFound'));
            this.order.set(null);
            return of(null);
          }

          this.loading.set(true);
          this.error.set(null);
          return this.orders.getById(numericId, this.token()).pipe(
            catchError((err: unknown) => {
              this.error.set(extractApiError(err, this.i18n.translate('order.loadError')));
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
          this.error.set(response.error ?? this.i18n.translate('order.notFound'));
          this.order.set(null);
          return;
        }
        this.order.set(response.data);
      });

    let firstLocale = true;
    effect(() => {
      this.locale.lang();
      if (firstLocale) {
        firstLocale = false;
        return;
      }
      this.retry$.next();
    });
  }

  protected retry(): void {
    this.retry$.next();
  }

  protected lineImage(line: OrderLineDto): string | null {
    return sanitizeImageUrl(line.imageUrl);
  }
}
