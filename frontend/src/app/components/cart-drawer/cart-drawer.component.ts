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
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { fromEvent } from 'rxjs';

import { cartItemCountLabel } from '../../models/cart.models';
import { LocaleService } from '../../i18n/locale.service';
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
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cart-drawer.component.html',
  styleUrl: './cart-drawer.component.css',
})
export class CartDrawerComponent {
  protected readonly cart = inject(CartService);
  protected readonly locale = inject(LocaleService);
  private readonly i18n = inject(TranslocoService);
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
    const count = this.cart.itemCount();
    const form = this.locale.pluralForm(count);
    return this.i18n.translate(`plural.cartItems.${form}`, { count });
  }

  protected retry(): void {
    this.cart.loadCart().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  protected goToProduct(slug: string): void {
    this.cart.closeDrawer();
    void this.router.navigate(this.locale.commands('catalog', slug));
  }

  protected continueShopping(): void {
    this.cart.closeDrawer();
  }
}
