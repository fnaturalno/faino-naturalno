import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { LocaleService } from '../../i18n/locale.service';
import {
  CatalogProduct,
  ProductVariantDto,
  formatVariantWeight,
  pickCheapestVariant,
} from '../../models/catalog.models';
import { sanitizeImageUrl } from '../../utils/sanitize-image-url';

export type ProductCardAddEvent = {
  productId: number;
  variantId: number;
};

@Component({
  selector: 'app-product-card',
  imports: [RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block h-full',
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'closeMenu()',
  },
  template: `
    <article
      class="group flex h-full min-w-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-white shadow-[var(--shadow-xs)] transition duration-200 motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-[var(--shadow-md)]"
    >
      <a
        [routerLink]="locale.commands('catalog', product().slug)"
        class="relative block aspect-square overflow-hidden bg-[var(--kraft-100)] focus-visible:z-10"
        [attr.aria-label]="'productCard.addAria' | transloco: { name: product().name }"
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
          <span class="grid h-full place-items-center font-[var(--font-accent)] text-xl text-[var(--kraft-400)]">{{ 'admin.photoFallback' | transloco }}</span>
        }
        @if (badge(); as badge) {
          <span
            class="absolute left-2 top-2 rounded-full bg-[var(--garden-500)] px-2.5 py-1 text-[11px] font-extrabold text-white sm:left-3 sm:top-3"
          >{{ badge.label }}</span>
        }
      </a>

      <div class="flex flex-1 flex-col gap-1.5 p-2.5 sm:p-3.5 lg:p-4">
        <span class="fn-eyebrow hidden text-[11px] lg:block">{{ product().categoryName }}</span>
        <a
          [routerLink]="locale.commands('catalog', product().slug)"
          class="line-clamp-2 min-h-[2.4em] font-bold leading-[1.2] text-[var(--espresso-900)] hover:text-[var(--cinnamon-700)] hover:no-underline sm:text-base lg:text-lg"
        >{{ product().name }}</a>
        @if (product().shortDescription) {
          <p class="hidden truncate text-sm text-[var(--text-muted)] lg:block">{{ product().shortDescription }}</p>
        }

        <div class="mt-auto flex flex-col gap-2 pt-2.5 lg:flex-row lg:items-end lg:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-baseline gap-x-1.5">
              <strong class="font-[var(--font-accent)] text-xl text-[var(--espresso-900)] sm:text-2xl">
                {{ 'productCard.priceFrom' | transloco: { price: formattedPriceFrom() } }}
              </strong>
            </div>
          </div>

          @if (!canAdd()) {
            <button
              type="button"
              class="min-h-11 w-full cursor-not-allowed rounded-lg border border-[var(--kraft-300)] bg-[var(--kraft-200)] px-3 py-2 text-sm font-extrabold text-[var(--kraft-500)] lg:min-h-9 lg:w-auto"
              disabled
            >
              {{ 'product.outOfStock' | transloco }}
            </button>
          } @else {
            <div class="relative w-full lg:w-auto">
              <div
                class="flex min-h-11 w-full overflow-hidden rounded-lg border border-[var(--marigold-600)] bg-[var(--marigold-400)] text-sm font-extrabold text-[var(--espresso-900)] transition group-hover:bg-[var(--marigold-500)] lg:min-h-9 lg:w-auto"
                [class.border-[var(--garden-600)]]="status() === 'added'"
                [class.bg-[var(--garden-500)]]="status() === 'added'"
                [class.text-white]="status() === 'added'"
                [class.opacity-70]="status() === 'adding'"
              >
                <button
                  type="button"
                  class="min-w-0 flex-1 px-3 py-2 text-left disabled:cursor-not-allowed"
                  [disabled]="status() === 'adding'"
                  [attr.aria-label]="'productCard.addAria' | transloco: { name: product().name }"
                  (click)="addCheapest($event)"
                >
                  @if (status() === 'adding') {
                    {{ 'product.adding' | transloco }}
                  } @else if (status() === 'added') {
                    {{ 'product.added' | transloco }}
                  } @else {
                    {{ 'product.addToCart' | transloco }}
                  }
                </button>
                @if (hasMultipleVariants()) {
                  <button
                    type="button"
                    class="grid w-9 shrink-0 place-items-center border-l border-[var(--kraft-500)] disabled:cursor-not-allowed"
                    [disabled]="status() === 'adding'"
                    [attr.aria-label]="'productCard.chooseWeight' | transloco"
                    [attr.aria-expanded]="menuOpen()"
                    aria-haspopup="menu"
                    (click)="toggleMenu($event)"
                  >
                    <svg
                      class="size-3.5 transition"
                      [class.rotate-180]="menuOpen()"
                      viewBox="0 0 12 12"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M2.5 4.25 6 7.75l3.5-3.5"
                        stroke="currentColor"
                        stroke-width="1.6"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      ></path>
                    </svg>
                  </button>
                }
              </div>

              @if (menuOpen() && hasMultipleVariants()) {
                <ul
                  role="menu"
                  class="absolute bottom-full right-0 z-20 mb-1.5 max-h-56 min-w-full overflow-y-auto rounded-lg border border-[var(--border-subtle)] bg-white py-1 shadow-[var(--shadow-md)] lg:min-w-[11rem]"
                  [attr.aria-label]="'productCard.chooseWeight' | transloco"
                >
                  @for (variant of variants(); track variant.id) {
                    <li role="none">
                      <button
                        type="button"
                        role="menuitem"
                        class="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm text-[var(--espresso-900)] transition hover:bg-[var(--marigold-100)]"
                        (click)="addVariant(variant, $event)"
                      >
                        <span class="font-semibold">{{ variantLabel(variant) }}</span>
                        <span class="shrink-0 tabular-nums text-[var(--espresso-700)]">
                          {{ formatPrice(variant.price) }} ₴
                        </span>
                      </button>
                    </li>
                  }
                </ul>
              }
            </div>
          }
        </div>
      </div>
    </article>
  `,
})
export class ProductCardComponent {
  readonly product = input.required<CatalogProduct>();
  readonly status = input<'idle' | 'adding' | 'added'>('idle');
  /** Emits product + variant; main click uses cheapest, menu uses chosen. */
  readonly add = output<ProductCardAddEvent>();

  protected readonly locale = inject(LocaleService);
  private readonly i18n = inject(TranslocoService);
  private readonly host = inject(ElementRef<HTMLElement>);
  protected readonly imageFailed = signal(false);
  protected readonly menuOpen = signal(false);

  protected readonly safeImageUrl = computed(() => {
    if (this.imageFailed()) {
      return null;
    }
    return sanitizeImageUrl(this.product().imageUrl);
  });

  protected readonly variants = computed((): ProductVariantDto[] => {
    const list = this.product().variants ?? [];
    return [...list].sort((a, b) => a.sortOrder - b.sortOrder);
  });

  protected readonly cheapestVariant = computed(() => {
    const fromList = pickCheapestVariant(this.variants());
    if (fromList) return fromList;
    const id = this.product().cheapestVariantId;
    return id ? ({ id } as ProductVariantDto) : null;
  });

  protected readonly hasMultipleVariants = computed(() => this.variants().length > 1);

  protected readonly formattedPriceFrom = computed(() => {
    this.locale.lang();
    return this.locale.formatNumber(this.product().priceFrom, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    });
  });

  protected readonly badge = computed(() => {
    this.locale.lang();
    const product = this.product();
    const age = Date.now() - new Date(product.createdAt).getTime();
    if (age >= 0 && age <= 30 * 24 * 60 * 60 * 1000) {
      return { label: this.i18n.translate('productCard.newBadge'), kind: 'new' as const };
    }
    return null;
  });

  protected readonly canAdd = computed(() => {
    const product = this.product();
    if (product.isAvailable === false) return false;
    return this.variants().length > 0 || !!product.cheapestVariantId;
  });

  protected formatPrice(price: number): string {
    this.locale.lang();
    return this.locale.formatNumber(price, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    });
  }

  protected variantLabel(variant: ProductVariantDto): string {
    this.locale.lang();
    return formatVariantWeight(variant.weight, variant.weightUnit, (n) =>
      this.locale.formatNumber(n, { maximumFractionDigits: 3, minimumFractionDigits: 0 }),
    );
  }

  protected toggleMenu(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.status() === 'adding') return;
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.menuOpen()) return;
    const target = event.target as Node | null;
    if (target && this.host.nativeElement.contains(target)) return;
    this.closeMenu();
  }

  protected addCheapest(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.closeMenu();
    const variant = this.cheapestVariant();
    if (!variant?.id || this.status() === 'adding') return;
    this.add.emit({ productId: this.product().id, variantId: variant.id });
  }

  protected addVariant(variant: ProductVariantDto, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.closeMenu();
    if (this.status() === 'adding') return;
    this.add.emit({ productId: this.product().id, variantId: variant.id });
  }
}
