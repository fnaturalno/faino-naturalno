import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TranslocoPipe } from '@jsverse/transloco';

import { NavbarComponent } from '../../components/navbar/navbar.component';

@Component({
  selector: 'app-contacts',
  imports: [NavbarComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fn-contacts min-h-dvh bg-[var(--bg-page)] text-[var(--espresso-800)]">
      <app-navbar />

      <main class="relative overflow-hidden">
        <div
          class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(245_184_0_/_18%),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgb(91_122_58_/_12%),transparent_45%)]"
          aria-hidden="true"
        ></div>

        <div class="relative mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14 lg:px-8 lg:pt-16">
          <p class="fn-eyebrow mb-4">{{ 'contacts.eyebrow' | transloco }}</p>
          <h1
            class="m-0 font-[var(--font-display)] text-[clamp(2rem,5vw,3.25rem)] font-extrabold leading-[1.1] tracking-tight text-[var(--espresso-900)]"
          >
            {{ 'contacts.title' | transloco }}
          </h1>

          <section class="mt-10 space-y-3 text-base leading-relaxed sm:text-lg" aria-labelledby="contacts-phone">
            <h2 id="contacts-phone" class="sr-only">{{ 'contacts.phoneLabel' | transloco }}</h2>
            <a
              [href]="phoneHref"
              class="inline-block font-[var(--font-display)] text-[clamp(1.5rem,3.5vw,2rem)] font-extrabold text-[var(--cinnamon-700)] hover:text-[var(--espresso-900)]"
            >
              {{ 'contacts.phone' | transloco }}
            </a>
            <p class="m-0 text-[var(--espresso-700)]">{{ 'contacts.person' | transloco }}</p>
          </section>

          <section class="mt-12" aria-labelledby="contacts-address">
            <h2
              id="contacts-address"
              class="m-0 font-[var(--font-display)] text-xl font-bold text-[var(--espresso-900)] sm:text-2xl"
            >
              {{ 'contacts.addressTitle' | transloco }}
            </h2>
            <address class="mt-4 not-italic text-base leading-relaxed sm:text-lg">
              <p class="m-0">{{ 'contacts.region' | transloco }}</p>
              <p class="m-0 mt-1">{{ 'contacts.city' | transloco }}</p>
              <p class="m-0 mt-1">{{ 'contacts.place' | transloco }}</p>
            </address>

            <div class="mt-6 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-white shadow-[var(--shadow-xs)]">
              <iframe
                [attr.title]="'contacts.mapTitle' | transloco"
                class="block h-64 w-full border-0 sm:h-80"
                loading="lazy"
                referrerpolicy="no-referrer-when-downgrade"
                allowfullscreen
                [src]="mapEmbedUrl"
              ></iframe>
            </div>
            <a
              [href]="mapHref"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-3 inline-flex cursor-pointer items-center gap-1.5 text-sm font-bold text-[var(--cinnamon-700)] hover:text-[var(--espresso-900)]"
            >
              {{ 'contacts.openMap' | transloco }}
              <span aria-hidden="true">↗</span>
            </a>
          </section>

          <div class="mt-14 grid gap-10 sm:grid-cols-2">
            <section aria-labelledby="contacts-online-hours">
              <h2
                id="contacts-online-hours"
                class="m-0 font-[var(--font-display)] text-lg font-bold text-[var(--espresso-900)] sm:text-xl"
              >
                {{ 'contacts.onlineHoursTitle' | transloco }}
              </h2>
              <ul class="mt-4 list-none space-y-2 p-0 text-sm sm:text-base">
                @for (day of days; track day) {
                  <li class="flex justify-between gap-4 border-b border-[var(--border-subtle)] py-1.5">
                    <span class="font-semibold text-[var(--espresso-800)]">{{ ('contacts.' + day) | transloco }}</span>
                    <span class="tabular-nums text-[var(--espresso-700)]">{{ 'contacts.onlineHours' | transloco }}</span>
                  </li>
                }
              </ul>
            </section>

            <section aria-labelledby="contacts-shop-hours">
              <h2
                id="contacts-shop-hours"
                class="m-0 font-[var(--font-display)] text-lg font-bold text-[var(--espresso-900)] sm:text-xl"
              >
                {{ 'contacts.shopHoursTitle' | transloco }}
              </h2>
              <ul class="mt-4 list-none space-y-2 p-0 text-sm sm:text-base">
                @for (day of days; track day) {
                  <li class="flex justify-between gap-4 border-b border-[var(--border-subtle)] py-1.5">
                    <span class="font-semibold text-[var(--espresso-800)]">{{ ('contacts.' + day) | transloco }}</span>
                    <span class="tabular-nums text-[var(--espresso-700)]">{{ 'contacts.shopHours' | transloco }}</span>
                  </li>
                }
              </ul>
            </section>
          </div>
        </div>
      </main>
    </div>
  `,
})
export class ContactsComponent {
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly phoneHref = 'tel:+380953488536';
  protected readonly mapHref = 'https://maps.google.com/maps?q=48.2067040,22.6398470';
  protected readonly mapEmbedUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
    'https://maps.google.com/maps?q=48.2067040,22.6398470&z=16&output=embed',
  );
  protected readonly days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
}
