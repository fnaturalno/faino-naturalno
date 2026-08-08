import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { CartDrawerComponent } from './components/cart-drawer/cart-drawer.component';
import { TestModeBannerComponent } from './components/test-mode-banner/test-mode-banner.component';
import { ToastHostComponent } from './components/toast-host/toast-host.component';
import { CartService } from './services/cart.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CartDrawerComponent, ToastHostComponent, TestModeBannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-test-mode-banner />
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
