import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { NavbarComponent } from '../../components/navbar/navbar.component';
import { LocaleService } from '../../i18n/locale.service';

@Component({
  selector: 'app-payment-delivery',
  imports: [NavbarComponent, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fn-payment-delivery min-h-dvh bg-[var(--bg-page)] text-[var(--espresso-800)]">
      <app-navbar />

      <main class="relative overflow-hidden">
        <div
          class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(245_184_0_/_18%),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgb(91_122_58_/_12%),transparent_45%)]"
          aria-hidden="true"
        ></div>

        <div class="relative mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14 lg:px-8 lg:pt-16">
          <p class="fn-eyebrow mb-4">{{ 'paymentDelivery.eyebrow' | transloco }}</p>
          <h1
            class="m-0 font-[var(--font-display)] text-[clamp(2rem,5vw,3.25rem)] font-extrabold leading-[1.1] tracking-tight text-[var(--espresso-900)]"
          >
            {{ 'paymentDelivery.title' | transloco }}
          </h1>
          <p
            class="mt-5 max-w-2xl font-[var(--font-accent)] text-[clamp(1.35rem,3vw,1.85rem)] leading-snug text-[var(--cinnamon-700)]"
          >
            {{ 'paymentDelivery.intro' | transloco }}
          </p>

          <section class="mt-14" aria-labelledby="pd-delivery-title">
            <h2
              id="pd-delivery-title"
              class="m-0 font-[var(--font-display)] text-xl font-bold text-[var(--espresso-900)] sm:text-2xl"
            >
              {{ 'paymentDelivery.deliveryTitle' | transloco }}
            </h2>

            <article class="mt-8 border-l-4 border-[var(--marigold-400)] pl-4">
              <h3 class="m-0 text-base font-extrabold text-[var(--espresso-900)] sm:text-lg">
                {{ 'paymentDelivery.npTitle' | transloco }}
              </h3>
              <ul class="mt-3 list-none space-y-2 p-0 text-base leading-relaxed sm:text-lg">
                <li class="m-0">{{ 'paymentDelivery.npBody' | transloco }}</li>
                <li class="m-0">{{ 'paymentDelivery.npEta' | transloco }}</li>
                <li class="m-0">{{ 'paymentDelivery.npCost' | transloco }}</li>
              </ul>
            </article>

            <article class="mt-8 border-l-4 border-[var(--garden-500)] pl-4">
              <h3 class="m-0 text-base font-extrabold text-[var(--espresso-900)] sm:text-lg">
                {{ 'paymentDelivery.ukrTitle' | transloco }}
              </h3>
              <ul class="mt-3 list-none space-y-2 p-0 text-base leading-relaxed sm:text-lg">
                <li class="m-0">{{ 'paymentDelivery.ukrBody' | transloco }}</li>
                <li class="m-0">{{ 'paymentDelivery.ukrEta' | transloco }}</li>
                <li class="m-0">{{ 'paymentDelivery.ukrFree' | transloco }}</li>
              </ul>
            </article>
          </section>

          <section class="mt-14" aria-labelledby="pd-payment-title">
            <h2
              id="pd-payment-title"
              class="m-0 font-[var(--font-display)] text-xl font-bold text-[var(--espresso-900)] sm:text-2xl"
            >
              {{ 'paymentDelivery.paymentTitle' | transloco }}
            </h2>
            <p class="mt-4 m-0 text-base leading-relaxed sm:text-lg">
              <span class="font-bold text-[var(--espresso-900)]">{{ 'paymentDelivery.paymentCashlessLabel' | transloco }}</span>
              {{ 'paymentDelivery.paymentCashlessBody' | transloco }}
            </p>
          </section>

          <div class="mt-14">
            <a
              [routerLink]="locale.commands('catalog')"
              class="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-[var(--radius-md)] bg-[var(--marigold-400)] px-6 py-3 text-sm font-extrabold text-[var(--espresso-900)] transition hover:bg-[var(--marigold-500)]"
            >
              {{ 'paymentDelivery.ctaCatalog' | transloco }}
            </a>
          </div>
        </div>
      </main>
    </div>
  `,
})
export class PaymentDeliveryComponent {
  protected readonly locale = inject(LocaleService);
}
