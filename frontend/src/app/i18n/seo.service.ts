import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';

import { LOCALES, hreflangFor } from './locale.types';
import { LocaleService } from './locale.service';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly locale = inject(LocaleService);

  /**
   * Set canonical + hreflang (BCP 47 `uk`/`en`, x-default→`/ua/…`) for home/catalog/product.
   * `pathAfterLocale` is e.g. ``, `catalog`, `catalog/slug`.
   */
  setAlternates(pathAfterLocale: string, pageTitle?: string): void {
    const origin = this.document.location?.origin ?? '';
    const suffix = pathAfterLocale ? `/${pathAfterLocale.replace(/^\//, '')}` : '';
    const current = this.locale.lang();
    const canonical = `${origin}/${current}${suffix}`;

    this.upsertLink('canonical', canonical);
    this.clearHreflang();

    for (const lang of LOCALES) {
      this.upsertLink('alternate', `${origin}/${lang}${suffix}`, hreflangFor(lang));
    }
    this.upsertLink('alternate', `${origin}/ua${suffix}`, 'x-default');

    if (pageTitle) {
      this.title.setTitle(pageTitle);
    }
  }

  clear(): void {
    this.clearHreflang();
    this.document.querySelectorAll('link[rel="canonical"]').forEach((el) => el.remove());
  }

  private clearHreflang(): void {
    this.document
      .querySelectorAll('link[rel="alternate"][hreflang]')
      .forEach((el) => el.remove());
  }

  private upsertLink(rel: string, href: string, hreflang?: string): void {
    const selector = hreflang
      ? `link[rel="${rel}"][hreflang="${hreflang}"]`
      : `link[rel="${rel}"]:not([hreflang])`;
    let link = this.document.querySelector(selector) as HTMLLinkElement | null;
    if (!link) {
      link = this.document.createElement('link');
      link.rel = rel;
      if (hreflang) link.hreflang = hreflang;
      this.document.head.appendChild(link);
    }
    link.href = href;
  }
}
