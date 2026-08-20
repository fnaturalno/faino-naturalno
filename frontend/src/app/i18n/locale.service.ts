import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';

import { LOCAL_STORAGE } from '../utils/browser-storage';
import {
  AppLocale,
  DEFAULT_LOCALE,
  intlLocale,
  isAppLocale,
  LOCALE_STORAGE_KEY,
  normalizeAppLocale,
} from './locale.types';

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly storage = inject(LOCAL_STORAGE);
  private readonly active = signal<AppLocale>(this.readStoredOrDefault());

  readonly lang = this.active.asReadonly();

  constructor() {
    this.apply(this.active(), false);
  }

  /** Sync from storefront URL segment — URL wins over storage. */
  setFromUrl(locale: AppLocale): void {
    this.apply(locale, true);
  }

  /** Admin / chrome-only switch — Transloco + localStorage, no navigation. */
  setUiLocale(locale: AppLocale): void {
    this.apply(locale, true);
  }

  /** Storefront switcher: replace locale segment, keep path + query. */
  switchStorefrontLocale(next: AppLocale): void {
    const url = this.router.url;
    const tree = this.router.parseUrl(url);
    const segments = tree.root.children['primary']?.segments.map((s) => s.path) ?? [];
    if (segments.length && isAppLocale(segments[0])) {
      segments[0] = next;
    } else if (segments[0] === 'uk') {
      segments[0] = next;
    } else {
      segments.unshift(next);
    }
    const nextTree = this.router.createUrlTree(['/', ...segments], {
      queryParams: tree.queryParams,
    });
    this.apply(next, true);
    void this.router.navigateByUrl(nextTree);
  }

  /** Absolute in-app commands with active locale prefix. */
  commands(...parts: (string | number)[]): (string | number)[] {
    return ['/', this.active(), ...parts];
  }

  /** Path string like `/ua/catalog`. */
  path(...parts: (string | number)[]): string {
    const rest = parts.map(String).filter(Boolean).join('/');
    return rest ? `/${this.active()}/${rest}` : `/${this.active()}`;
  }

  /** Link to storefront from admin using stored locale. */
  storefrontCommands(...parts: (string | number)[]): (string | number)[] {
    return ['/', this.active(), ...parts];
  }

  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(intlLocale(this.active()), options).format(value);
  }

  formatPrice(value: number): string {
    return `${this.formatNumber(value, { maximumFractionDigits: 2, minimumFractionDigits: 0 })} ₴`;
  }

  formatDate(iso: string, options?: Intl.DateTimeFormatOptions): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    const formatted = new Intl.DateTimeFormat(
      intlLocale(this.active()),
      options ?? { day: 'numeric', month: 'long', year: 'numeric' },
    ).format(date);
    return this.active() === 'ua' ? formatted.replace(/\s*р\.?$/u, '') : formatted;
  }

  /** Ukrainian/English plural form picker (one / few / many). */
  pluralForm(count: number): 'one' | 'few' | 'many' {
    const n = Math.abs(Math.trunc(count));
    if (this.active() === 'en') {
      return n === 1 ? 'one' : 'many';
    }
    const mod100 = n % 100;
    const mod10 = n % 10;
    if (mod100 > 10 && mod100 < 20) return 'many';
    if (mod10 === 1) return 'one';
    if (mod10 >= 2 && mod10 <= 4) return 'few';
    return 'many';
  }

  private apply(locale: AppLocale, persist: boolean): void {
    if (this.active() !== locale) {
      this.active.set(locale);
    }
    // Always sync Transloco — another initializer/load may have changed it
    // while LocaleService already held this locale (e.g. reload on /en/…).
    this.transloco.setActiveLang(locale);
    this.document.documentElement.lang = locale === 'ua' ? 'uk' : locale;
    if (persist) {
      this.storage.setItem(LOCALE_STORAGE_KEY, locale);
    }
  }

  private readStoredOrDefault(): AppLocale {
    const stored = this.storage.getItem(LOCALE_STORAGE_KEY);
    const normalized = normalizeAppLocale(stored);
    if (normalized) return normalized;
    return DEFAULT_LOCALE;
  }
}
