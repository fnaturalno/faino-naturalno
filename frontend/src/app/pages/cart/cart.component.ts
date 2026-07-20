import { DecimalPipe, Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';

import { CartLineComponent } from '../../components/cart-line/cart-line.component';
import { IconComponent } from '../../components/icon/icon.component';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { cartItemCountLabel } from '../../models/cart.models';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-cart',
  imports: [
    CartLineComponent,
    DecimalPipe,
    IconComponent,
    NavbarComponent,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cart.component.html',
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
export class CartComponent {
  protected readonly cart = inject(CartService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly skeletonSlots = [0, 1, 2];

  constructor() {
    this.cart.closeDrawer();
    this.cart.loadCart().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  protected countLabel(): string {
    return cartItemCountLabel(this.cart.itemCount());
  }

  protected retry(): void {
    this.cart.loadCart().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  protected goBack(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      this.location.back();
      return;
    }
    void this.router.navigate(['/catalog']);
  }

  protected goToProduct(slug: string): void {
    void this.router.navigate(['/catalog', slug]);
  }
}
