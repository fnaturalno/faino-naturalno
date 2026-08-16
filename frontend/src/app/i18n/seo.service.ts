import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { TranslocoService } from '@jsverse/transloco';

import { LOCALES, hreflangFor } from './locale.types';
import { LocaleService } from './locale.service';
import { sanitizeImageUrl } from '../utils/sanitize-image-url';

export interface SeoPageMeta {
  description?: string | null;
  imageUrl?: string | null;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly locale = inject(LocaleService);
  private readonly i18n = inject(TranslocoService);

  /**
   * Set canonical + hreflang (BCP 47 `uk`/`en`, x-default→`/ua/…`) and shop meta tags.
   * `pathAfterLocale` is e.g. ``, `catalog`, `catalog/slug`.
   */
  setAlternates(pathAfterLocale: string, pageTitle?: string, page?: SeoPageMeta): void {
    const origin = this.document.location?.origin ?? '';
    const suffix = pathAfterLocale ? `/${pathAfterLocale.replace(/^\//, '')}` : '';
    const current = this.locale.lang();
    const canonical = `${origin}/${current}${suffix}`;
    const brand = this.i18n.translate('brand');
    const title = pageTitle?.trim() || brand;
    const fallbackDescription = this.i18n.translate('seo.description') ?? '';
    const description = (page?.description?.trim() || fallbackDescription).slice(0, 320);
    const image = this.absoluteImageUrl(page?.imageUrl, origin);

    this.document.documentElement.lang = hreflangFor(current);

    this.upsertLink('canonical', canonical);
    this.clearHreflang();

    for (const lang of LOCALES) {
      this.upsertLink('alternate', `${origin}/${lang}${suffix}`, hreflangFor(lang));
    }
    this.upsertLink('alternate', `${origin}/ua${suffix}`, 'x-default');

    this.title.setTitle(title);

    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'theme-color', content: '#f5b800' });

    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: brand });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: canonical });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({
      property: 'og:locale',
      content: current === 'en' ? 'en_US' : 'uk_UA',
    });
    this.meta.updateTag({
      property: 'og:locale:alternate',
      content: current === 'en' ? 'uk_UA' : 'en_US',
    });

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: image });
  }

  clear(): void {
    this.clearHreflang();
    this.document.querySelectorAll('link[rel="canonical"]').forEach((el) => el.remove());
  }

  private absoluteImageUrl(url: string | null | undefined, origin: string): string {
    const sanitized = sanitizeImageUrl(url);
    if (!sanitized) {
      return `${origin}/logo.png`;
    }
    if (sanitized.startsWith('http://') || sanitized.startsWith('https://')) {
      return sanitized;
    }
    return `${origin}${sanitized.startsWith('/') ? sanitized : `/${sanitized}`}`;
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
