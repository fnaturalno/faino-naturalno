import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { CatalogProduct } from '../../models/catalog.models';
import { sanitizeImageUrl } from '../../utils/sanitize-image-url';

@Component({
  selector: 'app-product-card',
  imports: [DecimalPipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
  template: `
    <article
      class="group flex h-full min-w-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-white shadow-[var(--shadow-xs)] transition duration-200 motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-[var(--shadow-md)]"
    >
      <a
        [routerLink]="['/catalog', product().slug]"
        class="relative block aspect-square overflow-hidden bg-[var(--kraft-100)] focus-visible:z-10"
        [attr.aria-label]="'Переглянути ' + product().name"
      >
        @if (safeImageUrl(); as imageUrl) {
          <img
            [src]="imageUrl"
            [alt]="product().name"
            class="h-full w-full object-cover"
            loading="lazy"
            (error)="imageFailed.set(true)"
          />
        } @else {
          <span class="grid h-full place-items-center font-[var(--font-accent)] text-xl text-[var(--kraft-400)]">фото</span>
        }
        @if (badge(); as badge) {
          <span
            class="absolute left-2 top-2 rounded-full px-2.5 py-1 text-[11px] font-extrabold text-white sm:left-3 sm:top-3"
            [class.bg-[var(--chili-500)]]="badge.kind === 'sale'"
            [class.bg-[var(--garden-500)]]="badge.kind === 'new'"
          >{{ badge.label }}</span>
        }
      </a>

      <div class="flex flex-1 flex-col gap-1.5 p-2.5 sm:p-3.5 lg:p-4">
        <span class="fn-eyebrow hidden text-[11px] lg:block">{{ product().categoryName }}</span>
        <a
          [routerLink]="['/catalog', product().slug]"
          class="line-clamp-2 min-h-[2.4em] font-bold leading-[1.2] text-[var(--espresso-900)] hover:text-[var(--cinnamon-700)] hover:no-underline sm:text-base lg:text-lg"
        >{{ product().name }}</a>
        @if (product().shortDescription) {
          <p class="hidden truncate text-sm text-[var(--text-muted)] lg:block">{{ product().shortDescription }}</p>
        }

        <div class="mt-auto flex flex-col gap-2 pt-2.5 lg:flex-row lg:items-end lg:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-baseline gap-x-1.5">
              <strong class="font-[var(--font-accent)] text-xl text-[var(--espresso-900)] sm:text-2xl">
                {{ product().price | number: '1.0-2' }} ₴
              </strong>
              @if (product().oldPrice && product().oldPrice! > product().price) {
                <del class="text-xs text-[var(--kraft-500)]">{{ product().oldPrice | number: '1.0-2' }} ₴</del>
              }
            </div>
            @if (unit(); as unit) {
              <span class="text-[11px] text-[var(--text-muted)]">/ {{ unit }}</span>
            }
          </div>
          <button
            type="button"
            class="min-h-11 w-full rounded-lg border border-[var(--marigold-600)] bg-[var(--marigold-400)] px-3 py-2 text-sm font-extrabold text-[var(--espresso-900)] transition group-hover:bg-[var(--marigold-500)] disabled:cursor-not-allowed disabled:border-[var(--kraft-300)] disabled:bg-[var(--kraft-200)] disabled:text-[var(--kraft-500)] lg:min-h-9 lg:w-auto"
            [class.bg-[var(--garden-500)]]="status() === 'added'"
            [class.text-white]="status() === 'added'"
            [disabled]="product().stockQuantity <= 0 || status() === 'adding'"
            (click)="add.emit(product().id)"
          >
            @if (product().stockQuantity <= 0) {
              Немає
            } @else if (status() === 'adding') {
              Додаємо…
            } @else if (status() === 'added') {
              Додано
            } @else {
              В кошик
            }
          </button>
        </div>
      </div>
    </article>
  `,
})
export class ProductCardComponent {
  readonly product = input.required<CatalogProduct>();
  readonly status = input<'idle' | 'adding' | 'added'>('idle');
  readonly add = output<number>();
  protected readonly imageFailed = signal(false);

  protected readonly safeImageUrl = computed(() => {
    if (this.imageFailed()) {
      return null;
    }
    return sanitizeImageUrl(this.product().imageUrl);
  });

  protected readonly badge = computed(() => {
    const product = this.product();
    if (product.oldPrice && product.oldPrice > product.price) {
      return {
        label: `-${Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}%`,
        kind: 'sale' as const,
      };
    }
    const age = Date.now() - new Date(product.createdAt).getTime();
    if (age >= 0 && age <= 30 * 24 * 60 * 60 * 1000) {
      return { label: 'Новинка', kind: 'new' as const };
    }
    return null;
  });

  protected readonly unit = computed(() => {
    const product = this.product();
    return product.weight && product.weightUnit
      ? `${product.weight.toLocaleString('uk-UA')} ${product.weightUnit}`
      : null;
  });
}
