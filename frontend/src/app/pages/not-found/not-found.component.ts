import { ChangeDetectionStrategy, Component, DestroyRef, RESPONSE_INIT, effect, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { NavbarComponent } from '../../components/navbar/navbar.component';
import { LocaleService } from '../../i18n/locale.service';
import { SeoService } from '../../i18n/seo.service';

@Component({
  selector: 'app-not-found',
  imports: [NavbarComponent, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.css',
})
export class NotFoundComponent {
  protected readonly locale = inject(LocaleService);
  private readonly i18n = inject(TranslocoService);
  private readonly seo = inject(SeoService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly destroyRef = inject(DestroyRef);
  private readonly responseInit = inject(RESPONSE_INIT, { optional: true });

  constructor() {
    if (this.responseInit) {
      this.responseInit.status = 404;
    }

    effect(() => {
      this.locale.lang();
      const brand = this.i18n.translate('brand');
      const pageTitle = `${this.i18n.translate('notFound.title')} · ${brand}`;
      this.seo.clear();
      this.title.setTitle(pageTitle);
      this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
      this.meta.updateTag({
        name: 'description',
        content: this.i18n.translate('notFound.body') || '',
      });
    });

    this.destroyRef.onDestroy(() => {
      this.meta.removeTag('name="robots"');
      this.seo.clear();
    });
  }
}
