import { DecimalPipe, Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { CartLineComponent } from '../../components/cart-line/cart-line.component';
import { IconComponent } from '../../components/icon/icon.component';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { cartItemCountLabel } from '../../models/cart.models';
import { LocaleService } from '../../i18n/locale.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-cart',
  imports: [
    CartLineComponent,
    DecimalPipe,
    IconComponent,
    NavbarComponent,
    RouterLink,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css',
})
export class CartComponent {
  protected readonly cart = inject(CartService);
  protected readonly locale = inject(LocaleService);
  private readonly i18n = inject(TranslocoService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly skeletonSlots = [0, 1, 2];

  constructor() {
    this.cart.closeDrawer();
    this.cart.loadCart().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  protected countLabel(): string {
    const count = this.cart.itemCount();
    const form = this.locale.pluralForm(count);
    return this.i18n.translate(`plural.cartItems.${form}`, { count });
  }

  protected retry(): void {
    this.cart.loadCart().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  protected goBack(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      this.location.back();
      return;
    }
    void this.router.navigate(this.locale.commands('catalog'));
  }

  protected goToProduct(slug: string): void {
    void this.router.navigate(this.locale.commands('catalog', slug));
  }
}
