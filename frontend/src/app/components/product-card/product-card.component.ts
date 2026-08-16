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
import { ProductStrengthComponent } from '../product-strength/product-strength.component';

export type ProductCardAddEvent = {
  productId: number;
  variantId: number;
};

@Component({
  selector: 'app-product-card',
  imports: [RouterLink, TranslocoPipe, ProductStrengthComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block h-full',
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'closeMenu()',
  },
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.css',
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
