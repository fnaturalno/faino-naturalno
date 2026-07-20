import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { CartDrawerComponent } from './components/cart-drawer/cart-drawer.component';
import { ToastHostComponent } from './components/toast-host/toast-host.component';
import { CartService } from './services/cart.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CartDrawerComponent, ToastHostComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <router-outlet />
    <app-cart-drawer />
    <app-toast-host />
  `,
})
export class App {
  constructor() {
    inject(CartService).hydrateOnInit();
  }
}
