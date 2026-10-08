import { ChangeDetectionStrategy, Component, afterNextRender, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { CartDrawerComponent } from './components/cart-drawer/cart-drawer.component';
import { ToastHostComponent } from './components/toast-host/toast-host.component';
import { CartService } from './services/cart.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CartDrawerComponent, ToastHostComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  constructor() {
    const cart = inject(CartService);
    afterNextRender(() => {
      cart.hydrateOnInit();
    });
  }
}
