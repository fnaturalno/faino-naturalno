import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Hybrid rendering: SEO storefront pages on the server; account/cart/admin on the client.
 */
export const serverRoutes: ServerRoute[] = [
  // Client-only (auth / cart / checkout / profile / orders / admin)
  { path: 'admin/**', renderMode: RenderMode.Client },
  { path: ':lang/admin/**', renderMode: RenderMode.Client },
  { path: ':lang/auth/**', renderMode: RenderMode.Client },
  { path: ':lang/profile', renderMode: RenderMode.Client },
  { path: ':lang/cart', renderMode: RenderMode.Client },
  { path: ':lang/checkout', renderMode: RenderMode.Client },
  { path: ':lang/order/:id', renderMode: RenderMode.Client },

  // Server-rendered public storefront
  { path: ':lang', renderMode: RenderMode.Server },
  { path: ':lang/catalog', renderMode: RenderMode.Server },
  { path: ':lang/catalog/:slug', renderMode: RenderMode.Server },
  { path: ':lang/news', renderMode: RenderMode.Server },
  { path: ':lang/news/:slug', renderMode: RenderMode.Server },
  { path: ':lang/about', renderMode: RenderMode.Server },
  { path: ':lang/contacts', renderMode: RenderMode.Server },
  { path: ':lang/payment-delivery', renderMode: RenderMode.Server },
  { path: ':lang/**', renderMode: RenderMode.Server },

  { path: '**', renderMode: RenderMode.Server },
];
