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
  templateUrl: './cart-line.component.html',
  styleUrl: './cart-line.component.css',
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
