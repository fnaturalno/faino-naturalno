import { Routes } from '@angular/router';

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
      import('./pages/product-placeholder/product-placeholder.component').then(
        (module) => module.ProductPlaceholderComponent,
      ),
  },
  { path: '**', redirectTo: 'catalog' },
];
