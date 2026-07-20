import { A11yModule } from '@angular/cdk/a11y';
import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { fromEvent } from 'rxjs';

import { cartItemCountLabel } from '../../models/cart.models';
import { CartService } from '../../services/cart.service';
import { CartLineComponent } from '../cart-line/cart-line.component';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-cart-drawer',
  imports: [
    A11yModule,
    CartLineComponent,
    DecimalPipe,
    IconComponent,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (cart.drawerOpen()) {
      <div class="fixed inset-0 z-40 hidden md:block" role="presentation">
        <button
          type="button"
          class="absolute inset-0 bg-[rgb(42_26_13_/_0.45)]"
          aria-label="Закрити"
          (click)="cart.closeDrawer()"
        ></button>

        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="cart-drawer-title"
          cdkTrapFocus
          [cdkTrapFocusAutoCapture]="true"
          class="absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col bg-[var(--surface-card)] shadow-[var(--shadow-lg)]"
          (keydown.escape)="cart.closeDrawer()"
        >
          <header
            class="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-[22px]"
          >
            <div class="flex items-baseline gap-2.5">
              <h2 id="cart-drawer-title" class="m-0 text-xl">Кошик</h2>
              @if (cart.loadStatus() === 'ready' && cart.items().length > 0) {
                <span class="text-sm text-[var(--text-muted)]">{{ countLabel() }}</span>
              }
            </div>
            <button
              type="button"
              class="grid size-9 place-items-center rounded-lg text-[var(--espresso-800)] hover:bg-[var(--kraft-100)]"
              aria-label="Закрити"
              (click)="cart.closeDrawer()"
            >
              <app-icon name="close" [size]="20" />
            </button>
          </header>

          <div class="flex min-h-0 flex-1 flex-col">
            @if (cart.loadStatus() === 'loading') {
              <div class="flex-1 space-y-4 overflow-y-auto px-6 py-4" aria-busy="true" aria-label="Завантаження кошика">
                @for (_ of skeletonSlots; track $index) {
                  <div class="flex gap-3.5 border-b border-[var(--border-subtle)] py-[18px]">
                    <div class="fn-cart-sk size-[76px] shrink-0 rounded-[var(--radius-md)]"></div>
                    <div class="flex flex-1 flex-col gap-2 py-1">
                      <div class="fn-cart-sk h-3 w-1/3 rounded-full"></div>
                      <div class="fn-cart-sk h-4 w-2/3 rounded-full"></div>
                      <div class="mt-auto flex justify-between pt-3">
                        <div class="fn-cart-sk h-8 w-[120px] rounded-full"></div>
                        <div class="fn-cart-sk h-5 w-16 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                }
              </div>
            } @else if (cart.loadStatus() === 'error') {
              <div class="flex flex-1 flex-col items-center justify-center gap-4 px-10 text-center">
                <p class="m-0 text-[var(--espresso-700)]">{{ cart.loadError() }}</p>
                <button
                  type="button"
                  class="rounded-[var(--radius-md)] bg-[var(--marigold-400)] px-5 py-3 font-extrabold text-[var(--espresso-900)] hover:bg-[var(--marigold-500)]"
                  (click)="retry()"
                >
                  Спробувати ще
                </button>
              </div>
            } @else if (cart.isEmpty()) {
              <div class="flex flex-1 flex-col items-center justify-center px-10 text-center">
                <div
                  class="mb-[26px] grid size-[132px] place-items-center rounded-full border border-[var(--border-subtle)] bg-[var(--kraft-100)] text-[var(--kraft-500)]"
                >
                  <app-icon name="shopping-basket" [size]="60" />
                </div>
                <h3 class="mb-2 text-xl">Кошик порожній</h3>
                <p class="mb-[26px] max-w-[280px] text-[var(--espresso-700)]">
                  Ще нічого не додали. Загляньте до каталогу — ми зібрали для вас багато смачного.
                </p>
                <a
                  routerLink="/catalog"
                  class="inline-flex h-[54px] items-center justify-center rounded-[var(--radius-md)] bg-[var(--marigold-400)] px-6 font-extrabold text-[var(--espresso-900)] hover:bg-[var(--marigold-500)]"
                  (click)="cart.closeDrawer()"
                >
                  Перейти до каталогу
                </a>
              </div>
            } @else {
              <div class="flex-1 overflow-y-auto px-6 py-2">
                @for (item of cart.items(); track item.cartItemId) {
                  <app-cart-line
                    [line]="item"
                    [pending]="cart.isLinePending(item.cartItemId)"
                    (quantityChange)="cart.updateQuantity(item.cartItemId, $event)"
                    (remove)="cart.removeItem(item.cartItemId)"
                    (productClick)="goToProduct(item.slug)"
                  />
                }
              </div>

              <footer
                class="border-t border-[var(--border-subtle)] bg-[var(--surface-cream)] px-6 pb-[calc(20px+env(safe-area-inset-bottom))] pt-5"
              >
                <div class="mb-1.5 flex items-center justify-between">
                  <span class="text-[var(--espresso-700)]">Сума товарів</span>
                  <span class="text-[var(--espresso-800)]"
                    >{{ cart.subtotal() | number: '1.0-2' }} ₴</span
                  >
                </div>
                <div class="mb-4 flex items-center justify-between">
                  <span class="text-[var(--espresso-700)]">Доставка</span>
                  <span class="text-sm text-[var(--text-muted)]">за тарифами перевізника</span>
                </div>
                <div
                  class="mb-[18px] flex items-baseline justify-between border-t border-[var(--border-subtle)] pt-3.5"
                >
                  <span class="font-[var(--font-display)] text-lg font-extrabold text-[var(--espresso-900)]"
                    >Разом</span
                  >
                  <span
                    class="font-[var(--font-accent)] text-2xl font-bold text-[var(--espresso-900)]"
                    >{{ cart.subtotal() | number: '1.0-2' }} ₴</span
                  >
                </div>
                <a
                  routerLink="/checkout"
                  class="flex h-[54px] w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--marigold-400)] font-extrabold text-[var(--espresso-900)] hover:bg-[var(--marigold-500)]"
                  (click)="cart.closeDrawer()"
                >
                  Оформити замовлення
                </a>
                <div class="mt-3.5 text-center">
                  <button
                    type="button"
                    class="text-sm font-semibold text-[var(--cinnamon-700)] hover:text-[var(--espresso-800)] hover:underline"
                    (click)="continueShopping()"
                  >
                    ← Продовжити покупки
                  </button>
                </div>
              </footer>
            }
          </div>
        </aside>
      </div>
    }
  `,
  styles: `
    @keyframes fnCartPulse {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.45;
      }
    }
    .fn-cart-sk {
      background: var(--kraft-200);
      animation: fnCartPulse 1.3s ease-in-out infinite;
    }
  `,
})
export class CartDrawerComponent {
  protected readonly cart = inject(CartService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly skeletonSlots = [0, 1, 2];

  constructor() {
    effect(() => {
      const open = this.cart.drawerOpen();
      document.body.style.overflow = open ? 'hidden' : '';
    });

    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (event.key === 'Escape' && this.cart.drawerOpen()) {
          this.cart.closeDrawer();
        }
      });

    this.destroyRef.onDestroy(() => {
      document.body.style.overflow = '';
    });
  }

  protected countLabel(): string {
    return cartItemCountLabel(this.cart.itemCount());
  }

  protected retry(): void {
    this.cart.loadCart().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  protected goToProduct(slug: string): void {
    this.cart.closeDrawer();
    void this.router.navigate(['/catalog', slug]);
  }

  protected continueShopping(): void {
    this.cart.closeDrawer();
  }
}
