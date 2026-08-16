import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { LocaleService } from '../../i18n/locale.service';
import { AppLocale } from '../../i18n/locale.types';

@Component({
  selector: 'app-language-switcher',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './language-switcher.component.html',
  styleUrl: './language-switcher.component.css',
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
