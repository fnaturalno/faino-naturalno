import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'catalog' },
  {
    path: 'catalog',
    loadComponent: () =>
      import('./pages/catalog/catalog.component').then((module) => module.CatalogComponent),
  },
  {
    path: 'catalog/:slug',
    loadComponent: () =>
      import('./pages/product/product.component').then((module) => module.ProductComponent),
  },
  {
    path: 'auth/login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/auth/login.component').then((module) => module.LoginComponent),
  },
  {
    path: 'auth/register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/auth/register.component').then((module) => module.RegisterComponent),
  },
  {
    path: 'auth/forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/auth/forgot-password.component').then(
        (module) => module.ForgotPasswordComponent,
      ),
  },
  {
    path: 'auth/reset-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/auth/reset-password.component').then(
        (module) => module.ResetPasswordComponent,
      ),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/profile/profile.component').then((module) => module.ProfileComponent),
  },
  {
    path: 'cart',
    loadComponent: () =>
      import('./pages/cart/cart.component').then((module) => module.CartComponent),
  },
  {
    path: 'checkout',
    loadComponent: () =>
      import('./pages/checkout/checkout.component').then((module) => module.CheckoutComponent),
  },
  {
    path: 'order/:id',
    loadComponent: () =>
      import('./pages/order-confirm/order-confirm.component').then(
        (module) => module.OrderConfirmComponent,
      ),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/admin/admin-shell.component').then((module) => module.AdminShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'products' },
      {
        path: 'products',
        loadComponent: () =>
          import('./pages/admin/admin-products.component').then((module) => module.AdminProductsComponent),
      },
      {
        path: 'products/new',
        loadComponent: () =>
          import('./pages/admin/admin-product-form.component').then(
            (module) => module.AdminProductFormComponent,
          ),
      },
      {
        path: 'products/:id/edit',
        loadComponent: () =>
          import('./pages/admin/admin-product-form.component').then(
            (module) => module.AdminProductFormComponent,
          ),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./pages/admin/admin-orders.component').then((module) => module.AdminOrdersComponent),
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./pages/admin/admin-categories.component').then(
            (module) => module.AdminCategoriesComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'catalog' },
];
