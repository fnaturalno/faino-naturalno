import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { catchError, map, of } from 'rxjs';

import { NavbarComponent } from '../../components/navbar/navbar.component';
import { LocaleService } from '../../i18n/locale.service';
import { SeoService } from '../../i18n/seo.service';
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
  private readonly i18n = inject(TranslocoService);
  private readonly seo = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);

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

  constructor() {
    effect(() => {
      this.locale.lang();
      const brand = this.i18n.translate('brand');
      this.seo.setAlternates(
        'payment-delivery',
        `${this.i18n.translate('nav.paymentDelivery')} · ${brand}`,
        { description: this.i18n.translate('paymentDelivery.intro') },
      );
    });
    this.destroyRef.onDestroy(() => this.seo.clear());
  }
}
