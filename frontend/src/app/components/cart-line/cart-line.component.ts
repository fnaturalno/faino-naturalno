import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { LocaleService } from '../../i18n/locale.service';
import { CartLineDto, cartLineMaxQuantity } from '../../models/cart.models';
import { sanitizeImageUrl } from '../../utils/sanitize-image-url';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-cart-line',
  imports: [DecimalPipe, IconComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="flex gap-3 border-b border-[var(--border-subtle)] py-4 md:gap-3.5 md:py-[18px]"
      [attr.aria-busy]="pending() || null"
    >
      @if (canOpenProduct()) {
        <button
          type="button"
          class="size-[72px] shrink-0 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--kraft-100)] md:size-[76px]"
          [attr.aria-label]="'cart.openProduct' | transloco: { name: line().name }"
          (click)="productClick.emit()"
        >
          @if (safeImage(); as src) {
            <img [src]="src" [alt]="line().name" class="size-full object-cover" (error)="imageFailed.set(true)" />
          } @else {
            <span
              class="grid size-full place-items-center font-[var(--font-accent)] text-xs text-[var(--kraft-400)]"
              >{{ 'common.photo' | transloco }}</span
            >
          }
        </button>
      } @else {
        <div
          class="grid size-[72px] shrink-0 place-items-center overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--kraft-100)] opacity-70 md:size-[76px]"
          aria-hidden="true"
        >
          @if (safeImage(); as src) {
            <img [src]="src" alt="" class="size-full object-cover" (error)="imageFailed.set(true)" />
          } @else {
            <span class="font-[var(--font-accent)] text-xs text-[var(--kraft-400)]">{{
              'common.photo' | transloco
            }}</span>
          }
        </div>
      }

      <div class="flex min-w-0 flex-1 flex-col">
        <div class="flex items-start justify-between gap-2 md:gap-2.5">
          <div class="min-w-0">
            @if (compact()) {
              @if (canOpenProduct()) {
                <button
                  type="button"
                  class="m-0 line-clamp-2 text-left font-[var(--font-body)] text-sm font-bold leading-tight text-[var(--espresso-900)] hover:underline"
                  [title]="line().name"
                  (click)="productClick.emit()"
                >
                  {{ line().name }}
                </button>
              } @else {
                <h4
                  class="m-0 line-clamp-2 font-[var(--font-body)] text-sm font-bold leading-tight text-[var(--espresso-900)]"
                  [title]="line().name"
                >
                  {{ line().name }}
                </h4>
              }
              <span class="mt-0.5 block text-xs text-[var(--text-muted)]">
                {{ weightLabel() }}
                @if (line().category) {
                  · {{ line().category }}
                }
              </span>
              <span class="mt-0.5 block text-xs text-[var(--espresso-700)]">
                {{ line().price | number: '1.0-2' }} ₴
              </span>
            } @else {
              <span class="fn-eyebrow mb-0.5 block text-[10px]">{{ line().category }}</span>
              @if (canOpenProduct()) {
                <button
                  type="button"
                  class="m-0 line-clamp-2 text-left font-[var(--font-body)] text-base font-bold leading-tight text-[var(--espresso-900)] hover:underline"
                  [title]="line().name"
                  (click)="productClick.emit()"
                >
                  {{ line().name }}
                </button>
              } @else {
                <h4
                  class="m-0 line-clamp-2 font-[var(--font-body)] text-base font-bold leading-tight text-[var(--espresso-900)]"
                  [title]="line().name"
                >
                  {{ line().name }}
                </h4>
              }
              <span class="mt-0.5 block text-xs text-[var(--text-muted)]">{{ weightLabel() }}</span>
              <span class="mt-0.5 block text-xs text-[var(--espresso-700)]">
                {{ line().price | number: '1.0-2' }} ₴
              </span>
            }
            @if (statusLabel(); as status) {
              <span class="mt-1 inline-block text-xs font-semibold text-[var(--chili-700)]">{{
                status
              }}</span>
            }
          </div>

          <button
            type="button"
            class="inline-flex shrink-0 p-0.5 text-[var(--kraft-500)] transition-colors hover:text-[var(--chili-500)] disabled:cursor-not-allowed disabled:opacity-50"
            [attr.aria-label]="'cart.removeItem' | transloco: { name: line().name }"
            [disabled]="pending()"
            (click)="remove.emit()"
          >
            <app-icon name="trash" [size]="compact() ? 16 : 17" />
          </button>
        </div>

        <div class="mt-auto flex items-center justify-between gap-2 pt-2.5 md:gap-2.5 md:pt-3">
          @if (purchasable()) {
            <div
              class="inline-flex h-8 items-stretch overflow-hidden rounded-full border border-[var(--border-strong)] bg-white"
              role="group"
              [attr.aria-label]="'product.quantity' | transloco"
            >
              <button
                type="button"
                class="grid w-8 place-items-center text-base font-bold text-[var(--espresso-800)] disabled:cursor-not-allowed disabled:text-[var(--kraft-400)]"
                [attr.aria-label]="'product.decreaseQty' | transloco"
                [disabled]="pending() || line().quantity <= 1"
                (click)="quantityChange.emit(line().quantity - 1)"
              >
                −
              </button>
              <span
                class="grid min-w-8 place-items-center border-x border-[var(--border-subtle)] text-sm font-bold tabular-nums"
                aria-live="polite"
                >{{ line().quantity }}</span
              >
              <button
                type="button"
                class="grid w-8 place-items-center text-base font-bold text-[var(--espresso-800)] disabled:cursor-not-allowed disabled:text-[var(--kraft-400)]"
                [attr.aria-label]="'product.increaseQty' | transloco"
                [disabled]="pending() || line().quantity >= maxQty()"
                (click)="quantityChange.emit(line().quantity + 1)"
              >
                +
              </button>
            </div>
          } @else {
            <span class="text-sm text-[var(--text-muted)]">× {{ line().quantity }}</span>
          }

          <span
            class="whitespace-nowrap font-[var(--font-accent)] font-bold text-[var(--espresso-900)]"
            [class.text-base]="compact()"
            [class.text-lg]="!compact()"
          >
            {{ line().lineTotal | number: '1.0-2' }} ₴
          </span>
        </div>
      </div>
    </article>
  `,
})
export class CartLineComponent {
  private readonly i18n = inject(TranslocoService);
  private readonly locale = inject(LocaleService);

  readonly line = input.required<CartLineDto>();
  readonly pending = input(false);
  /** Mobile list uses compact typography. */
  readonly compact = input(false);

  readonly quantityChange = output<number>();
  readonly remove = output<void>();
  readonly productClick = output<void>();

  protected readonly imageFailed = signal(false);
  private lastImageLineId = -1;

  constructor() {
    effect(() => {
      const id = this.line().cartItemId;
      if (id !== this.lastImageLineId) {
        this.lastImageLineId = id;
        this.imageFailed.set(false);
      }
    });
  }

  protected readonly safeImage = computed(() => {
    if (this.imageFailed()) return null;
    return sanitizeImageUrl(this.line().imageUrl);
  });

  protected readonly maxQty = computed(() => cartLineMaxQuantity());

  /** Active products stay linkable even when temporarily out of stock. */
  protected readonly canOpenProduct = computed(() => this.line().isActive);

  protected readonly purchasable = computed(
    () => this.line().isActive && this.line().isAvailable !== false,
  );

  protected readonly weightLabel = computed(() => {
    const line = this.line();
    this.locale.lang();
    if (!line.weightUnit) return '';
    return `${this.locale.formatNumber(line.weight)} ${line.weightUnit}`;
  });

  protected readonly statusLabel = computed(() => {
    const line = this.line();
    this.locale.lang();
    if (!line.isActive) return this.i18n.translate('cart.unavailable');
    if (line.isAvailable === false) return this.i18n.translate('cart.outOfStock');
    return null;
  });
}
