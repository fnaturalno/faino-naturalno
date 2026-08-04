import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { LocaleService } from '../../i18n/locale.service';
import { AppLocale } from '../../i18n/locale.types';

@Component({
  selector: 'app-language-switcher',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="inline-flex items-center gap-0.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--kraft-100)] p-0.5"
      role="group"
      [attr.aria-label]="'nav.language' | transloco"
    >
      @for (option of options; track option.code) {
        <button
          type="button"
          class="inline-flex min-w-9 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-xs font-extrabold uppercase tracking-wide transition"
          [class.bg-white]="active() === option.code"
          [class.text-[var(--espresso-900)]]="active() === option.code"
          [class.shadow-sm]="active() === option.code"
          [class.text-[var(--kraft-500)]]="active() !== option.code"
          [attr.aria-pressed]="active() === option.code"
          [attr.aria-label]="option.labelKey | transloco"
          (click)="select(option.code)"
        >
          <svg
            class="size-3.5 shrink-0 rounded-[2px] shadow-[0_0_0_1px_rgba(42,26,13,0.12)]"
            viewBox="0 0 16 12"
            aria-hidden="true"
            focusable="false"
          >
            @if (option.code === 'ua') {
              <rect width="16" height="6" y="0" fill="#0057B7" />
              <rect width="16" height="6" y="6" fill="#FFD700" />
            } @else {
              <rect width="16" height="12" fill="#B22234" />
              <rect y="1.33" width="16" height="1.33" fill="#fff" />
              <rect y="4" width="16" height="1.33" fill="#fff" />
              <rect y="6.67" width="16" height="1.33" fill="#fff" />
              <rect y="9.33" width="16" height="1.33" fill="#fff" />
              <rect width="7.2" height="6.5" fill="#3C3B6E" />
            }
          </svg>
          <span>{{ option.code }}</span>
        </button>
      }
    </div>
  `,
})
export class LanguageSwitcherComponent {
  /** `storefront` navigates; `ui` only updates Transloco + storage (admin). */
  readonly mode = input<'storefront' | 'ui'>('storefront');

  private readonly locale = inject(LocaleService);
  protected readonly options: { code: AppLocale; labelKey: string }[] = [
    { code: 'ua', labelKey: 'common.langUa' },
    { code: 'en', labelKey: 'common.langEn' },
  ];
  protected readonly active = computed(() => this.locale.lang());

  protected select(next: AppLocale): void {
    if (next === this.locale.lang()) return;
    if (this.mode() === 'ui') {
      this.locale.setUiLocale(next);
      return;
    }
    this.locale.switchStorefrontLocale(next);
  }
}
