import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { NavbarComponent } from '../../components/navbar/navbar.component';
import { LocaleService } from '../../i18n/locale.service';

@Component({
  selector: 'app-about',
  imports: [NavbarComponent, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fn-about min-h-dvh bg-[var(--bg-page)] text-[var(--espresso-800)]">
      <app-navbar />

      <main class="relative overflow-hidden">
        <div
          class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(245_184_0_/_18%),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgb(91_122_58_/_12%),transparent_45%)]"
          aria-hidden="true"
        ></div>

        <div class="relative mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14 lg:px-8 lg:pt-16">
          <p class="fn-eyebrow mb-4">{{ 'about.eyebrow' | transloco }}</p>
          <h1
            class="m-0 font-[var(--font-display)] text-[clamp(2rem,5vw,3.25rem)] font-extrabold leading-[1.1] tracking-tight text-[var(--espresso-900)]"
          >
            {{ 'brand' | transloco }}
          </h1>
          <p
            class="mt-5 max-w-2xl font-[var(--font-accent)] text-[clamp(1.5rem,3.5vw,2.15rem)] leading-snug text-[var(--cinnamon-700)]"
          >
            {{ 'about.welcome' | transloco }}
          </p>

          <div class="mt-10 space-y-6 text-base leading-relaxed sm:text-lg">
            <p class="m-0">{{ 'about.hook1' | transloco }}</p>
            <p class="m-0">{{ 'about.hook2' | transloco }}</p>
          </div>

          <section class="mt-14" [attr.aria-labelledby]="'about-why-title'">
            <h2
              id="about-why-title"
              class="m-0 font-[var(--font-display)] text-xl font-bold text-[var(--espresso-900)] sm:text-2xl"
            >
              {{ 'about.whyTitle' | transloco }}
            </h2>
            <p class="mt-4 m-0 text-base leading-relaxed sm:text-lg">{{ 'about.whyBody' | transloco }}</p>
          </section>

          <section class="mt-14" [attr.aria-labelledby]="'about-topics-title'">
            <h2
              id="about-topics-title"
              class="m-0 font-[var(--font-display)] text-xl font-bold text-[var(--espresso-900)] sm:text-2xl"
            >
              {{ 'about.topicsTitle' | transloco }}
            </h2>
            <ul class="mt-6 list-none space-y-5 p-0">
              <li class="border-l-4 border-[var(--marigold-400)] pl-4">
                <p class="m-0 font-bold text-[var(--espresso-900)]">{{ 'about.topic1Title' | transloco }}</p>
                <p class="mt-1 m-0 text-[var(--espresso-700)]">{{ 'about.topic1Body' | transloco }}</p>
              </li>
              <li class="border-l-4 border-[var(--garden-500)] pl-4">
                <p class="m-0 font-bold text-[var(--espresso-900)]">{{ 'about.topic2Title' | transloco }}</p>
                <p class="mt-1 m-0 text-[var(--espresso-700)]">{{ 'about.topic2Body' | transloco }}</p>
              </li>
              <li class="border-l-4 border-[var(--cinnamon-700)] pl-4">
                <p class="m-0 font-bold text-[var(--espresso-900)]">{{ 'about.topic3Title' | transloco }}</p>
                <p class="mt-1 m-0 text-[var(--espresso-700)]">{{ 'about.topic3Body' | transloco }}</p>
              </li>
            </ul>
          </section>

          <div class="mt-14">
            <a
              [routerLink]="locale.commands('catalog')"
              class="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--marigold-400)] px-6 py-3 text-sm font-extrabold text-[var(--espresso-900)] transition hover:bg-[var(--marigold-500)]"
            >
              {{ 'about.ctaCatalog' | transloco }}
            </a>
          </div>
        </div>
      </main>
    </div>
  `,
})
export class AboutComponent {
  protected readonly locale = inject(LocaleService);
}
