import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { NavbarComponent } from '../../components/navbar/navbar.component';
import { LocaleService } from '../../i18n/locale.service';
import { SeoService } from '../../i18n/seo.service';

@Component({
  selector: 'app-about',
  imports: [NavbarComponent, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './about.component.html',
  styleUrl: './about.component.css',
})
export class AboutComponent {
  protected readonly locale = inject(LocaleService);
  private readonly i18n = inject(TranslocoService);
  private readonly seo = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    effect(() => {
      this.locale.lang();
      const brand = this.i18n.translate('brand');
      this.seo.setAlternates('about', `${this.i18n.translate('nav.about')} · ${brand}`);
    });
    this.destroyRef.onDestroy(() => this.seo.clear());
  }
}
