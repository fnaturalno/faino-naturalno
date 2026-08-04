import { DecimalPipe, Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  Subject,
  catchError,
  distinctUntilChanged,
  finalize,
  map,
  merge,
  of,
  switchMap,
  tap,
} from 'rxjs';

import { IconComponent } from '../../components/icon/icon.component';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { LocaleService } from '../../i18n/locale.service';
import { SeoService } from '../../i18n/seo.service';
import {
  ProductDetail,
  ProductVariantDto,
  formatVariantWeight,
  pickCheapestVariant,
} from '../../models/catalog.models';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';
import { sanitizeImageUrl } from '../../utils/sanitize-image-url';

type PageStatus = 'loading' | 'ready' | 'not-found' | 'error';
type CartUiStatus = 'idle' | 'adding' | 'added';

@Component({
  selector: 'app-product',
  imports: [
    DecimalPipe,
    IconComponent,
    NavbarComponent,
    ProductCardComponent,
    RouterLink,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product.component.html',
  styles: `
    @keyframes fnPulse {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.45;
      }
    }
    @keyframes fnToastIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .fn-sk {
      background: var(--kraft-200);
      border-radius: var(--radius-sm);
      animation: fnPulse 1.3s ease-in-out infinite;
    }
    .fn-toast-in {
      animation: fnToastIn 0.22s ease-out;
    }
  `,
})
export class ProductComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly productsApi = inject(ProductService);
  private readonly cart = inject(CartService);
  protected readonly locale = inject(LocaleService);
  private readonly i18n = inject(TranslocoService);
  private readonly seo = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly retry$ = new Subject<void>();
  private toastTimer?: ReturnType<typeof setTimeout>;
  private addedTimer?: ReturnType<typeof setTimeout>;
  private readonly similarAddedTimers = new Map<number, ReturnType<typeof setTimeout>>();

  protected readonly status = signal<PageStatus>('loading');
  protected readonly product = signal<ProductDetail | null>(null);
  protected readonly quantity = signal(1);
  protected readonly activeThumb = signal(0);
  protected readonly mainImageFailed = signal(false);
  protected readonly thumbFailed = signal<Record<number, boolean>>({});
  protected readonly addStatus = signal<CartUiStatus>('idle');
  protected readonly similarStatuses = signal<Record<number, CartUiStatus>>({});
  protected readonly selectedVariantId = signal<number | null>(null);
  protected readonly toast = signal<{
    title: string;
    detail: string | null;
    error: boolean;
  } | null>(null);

  protected readonly gallery = computed(() => {
    const detail = this.product();
    if (!detail) return [] as string[];
    const urls = (detail.imageUrls ?? []).filter((url) => !!url?.trim());
    if (urls.length) return urls.slice(0, 4);
    if (detail.imageUrl?.trim()) return [detail.imageUrl.trim()];
    return [];
  });

  protected readonly activeImage = computed(() => {
    const images = this.gallery();
    if (!images.length) return null;
    const index = Math.min(this.activeThumb(), images.length - 1);
    return images[index] ?? null;
  });

  protected readonly safeActiveImage = computed(() => {
    if (this.mainImageFailed()) return null;
    return sanitizeImageUrl(this.activeImage());
  });

  protected readonly variants = computed(() => {
    const list = this.product()?.variants ?? [];
    return [...list].sort((a, b) => a.sortOrder - b.sortOrder);
  });

  protected readonly hasMultipleVariants = computed(() => this.variants().length > 1);

  protected readonly selectedVariant = computed((): ProductVariantDto | null => {
    const id = this.selectedVariantId();
    const list = this.variants();
    if (!list.length) return null;
    return list.find((v) => v.id === id) ?? list[0] ?? null;
  });

  protected readonly badge = computed(() => {
    const detail = this.product();
    if (!detail) return null;
    this.locale.lang();
    const age = Date.now() - new Date(detail.createdAt).getTime();
    if (age >= 0 && age <= 30 * 24 * 60 * 60 * 1000) {
      return { label: this.i18n.translate('product.newBadge'), kind: 'new' as const };
    }
    return null;
  });

  protected readonly unitLabel = computed(() => {
    const variant = this.selectedVariant();
    if (!variant) return null;
    return formatVariantWeight(variant.weight, variant.weightUnit, (n) =>
      this.locale.formatNumber(n),
    );
  });

  protected readonly maxQuantity = computed(() => 12);

  protected readonly canAdd = computed(() => {
    const detail = this.product();
    const variant = this.selectedVariant();
    return (
      !!detail &&
      detail.isAvailable !== false &&
      !!variant &&
      this.addStatus() !== 'adding'
    );
  });

  protected readonly isAvailable = computed(() => {
    const detail = this.product();
    return !!detail && detail.isAvailable !== false && this.variants().length > 0;
  });

  protected readonly similar = computed(() => this.product()?.similarProducts ?? []);

  constructor() {
    this.destroyRef.onDestroy(() => {
      clearTimeout(this.toastTimer);
      clearTimeout(this.addedTimer);
      this.clearSimilarAddedTimers();
      this.retry$.complete();
    });

    const slugFromRoute$ = this.route.paramMap.pipe(
      map((params) => params.get('slug')?.trim() ?? ''),
      distinctUntilChanged(),
    );

    const slugFromRetry$ = this.retry$.pipe(
      map(() => this.route.snapshot.paramMap.get('slug')?.trim() ?? ''),
    );

    merge(slugFromRoute$, slugFromRetry$)
      .pipe(
        tap(() => this.resetForSlugChange()),
        switchMap((slug) => {
          if (!slug) {
            this.status.set('not-found');
            return of(null);
          }
          return this.productsApi.getBySlug(slug).pipe(
            map((response) => {
              if (!response.success || !response.data) {
                this.status.set('not-found');
                return null;
              }
              return response.data;
            }),
            catchError((error) => {
              this.status.set(mapProductLoadStatus(error));
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((detail) => {
        if (!detail) {
          this.product.set(null);
          return;
        }
        this.applyProductDetail(detail);
      });

    let firstLocale = true;
    effect(() => {
      this.locale.lang();
      if (firstLocale) {
        firstLocale = false;
        return;
      }
      this.retry$.next();
    });
  }

  protected goBack(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      this.location.back();
      return;
    }
    void this.router.navigate(this.locale.commands('catalog'));
  }

  protected retry(): void {
    this.retry$.next();
  }

  protected selectThumb(index: number): void {
    this.activeThumb.set(index);
    this.mainImageFailed.set(false);
  }

  protected onMainImageError(): void {
    this.mainImageFailed.set(true);
  }

  protected onThumbError(index: number): void {
    this.thumbFailed.update((map) => ({ ...map, [index]: true }));
  }

  protected safeThumbUrl(url: string, index: number): string | null {
    if (this.thumbFailed()[index]) return null;
    return sanitizeImageUrl(url);
  }

  protected selectVariant(id: number): void {
    this.selectedVariantId.set(id);
  }

  protected decreaseQty(): void {
    this.quantity.update((value) => Math.max(1, value - 1));
  }

  protected increaseQty(): void {
    const max = this.maxQuantity();
    if (max < 1) return;
    this.quantity.update((value) => Math.min(max, value + 1));
  }

  protected addToCart(): void {
    const detail = this.product();
    const variant = this.selectedVariant();
    if (!detail || !variant || !this.canAdd()) return;

    const qty = Math.min(this.quantity(), this.maxQuantity());
    this.addStatus.set('adding');
    this.cart
      .addItem(variant.id, qty)
      .pipe(
        finalize(() => {
          if (this.addStatus() === 'adding') this.addStatus.set('idle');
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          if (!response.success) {
            this.showToast(
              response.error || this.i18n.translate('product.addError'),
              null,
              true,
            );
            return;
          }
          this.addStatus.set('added');
          clearTimeout(this.addedTimer);
          this.addedTimer = setTimeout(() => this.addStatus.set('idle'), 1600);
          this.showToast(this.i18n.translate('product.addedToast'), `${detail.name} × ${qty}`, false);
        },
        error: () =>
          this.showToast(this.i18n.translate('product.addError'), null, true),
      });
  }

  protected addSimilar(event: { productId: number; variantId: number }): void {
    const { productId, variantId } = event;
    if (this.similarStatuses()[productId] === 'adding') return;
    const similar = this.similar().find((item) => item.id === productId);
    if (!similar || !variantId) return;

    this.setSimilarStatus(productId, 'adding');
    this.cart
      .addItem(variantId, 1)
      .pipe(
        finalize(() => {
          if (this.similarStatuses()[productId] === 'adding') {
            this.setSimilarStatus(productId, 'idle');
          }
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          if (!response.success) {
            this.showToast(
              response.error || this.i18n.translate('product.addError'),
              null,
              true,
            );
            return;
          }
          this.setSimilarStatus(productId, 'added');
          this.showToast(this.i18n.translate('product.addedToast'), `${similar.name} × 1`, false);
          this.scheduleSimilarAddedReset(productId);
        },
        error: () =>
          this.showToast(this.i18n.translate('product.addError'), null, true),
      });
  }

  protected similarStatus(id: number): CartUiStatus {
    return this.similarStatuses()[id] ?? 'idle';
  }

  protected variantLabel(variant: ProductVariantDto): string {
    return formatVariantWeight(variant.weight, variant.weightUnit, (n) =>
      this.locale.formatNumber(n),
    );
  }

  private resetForSlugChange(): void {
    this.status.set('loading');
    this.product.set(null);
    this.quantity.set(1);
    this.activeThumb.set(0);
    this.mainImageFailed.set(false);
    this.thumbFailed.set({});
    this.addStatus.set('idle');
    this.similarStatuses.set({});
    this.selectedVariantId.set(null);
    this.toast.set(null);
    clearTimeout(this.toastTimer);
    clearTimeout(this.addedTimer);
    this.clearSimilarAddedTimers();
  }

  private applyProductDetail(detail: ProductDetail): void {
    const variants = [...(detail.variants ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
    this.product.set({
      ...detail,
      imageUrls: detail.imageUrls ?? [],
      variants,
      similarProducts: detail.similarProducts ?? [],
    });
    const cheapest = pickCheapestVariant(variants);
    this.selectedVariantId.set(cheapest?.id ?? null);
    this.seo.setAlternates(`catalog/${detail.slug}`, detail.name);
    this.quantity.set(1);
    this.status.set('ready');
  }

  private setSimilarStatus(id: number, status: CartUiStatus): void {
    this.similarStatuses.update((statuses) => ({ ...statuses, [id]: status }));
  }

  private scheduleSimilarAddedReset(productId: number): void {
    const existing = this.similarAddedTimers.get(productId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      this.similarAddedTimers.delete(productId);
      this.setSimilarStatus(productId, 'idle');
    }, 1200);
    this.similarAddedTimers.set(productId, timer);
  }

  private clearSimilarAddedTimers(): void {
    for (const timer of this.similarAddedTimers.values()) {
      clearTimeout(timer);
    }
    this.similarAddedTimers.clear();
  }

  private showToast(title: string, detail: string | null, error: boolean): void {
    clearTimeout(this.toastTimer);
    this.toast.set({ title, detail, error });
    this.toastTimer = setTimeout(() => this.toast.set(null), 3000);
  }
}

function mapProductLoadStatus(error: unknown): PageStatus {
  if (error instanceof HttpErrorResponse && error.status === 404) {
    return 'not-found';
  }
  return 'error';
}
