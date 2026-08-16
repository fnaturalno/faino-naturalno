import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { catchError, map, of } from 'rxjs';

import { NavbarComponent } from '../../components/navbar/navbar.component';
import { LocaleService } from '../../i18n/locale.service';
import { ShopSettingsService } from '../../services/shop-settings.service';

const DEFAULT_UKR_FREE_FROM = 1300;

@Component({
  selector: 'app-payment-delivery',
  imports: [NavbarComponent, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './payment-delivery.component.html',
  styleUrl: './payment-delivery.component.css',
})
export class PaymentDeliveryComponent {
  protected readonly locale = inject(LocaleService);
  private readonly settings = inject(ShopSettingsService);

  private readonly ukrFreeFrom = toSignal(
    this.settings.get().pipe(
      map((response) =>
        response.success ? response.data.ukrposhtaFreeFromAmount : DEFAULT_UKR_FREE_FROM,
      ),
      catchError(() => of(DEFAULT_UKR_FREE_FROM)),
    ),
    { initialValue: DEFAULT_UKR_FREE_FROM },
  );

  protected readonly ukrFreeAmount = computed(() =>
    this.locale.formatNumber(this.ukrFreeFrom(), { maximumFractionDigits: 0 }),
  );
}
