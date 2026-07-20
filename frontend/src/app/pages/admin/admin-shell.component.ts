import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-[#fbf6ea] text-[#2a1a0d] lg:flex">
      <aside class="hidden w-60 shrink-0 flex-col bg-[#3b2412] p-4 text-[#fbf6ea] lg:flex">
        <a routerLink="/admin/products" class="px-2 py-4 text-xl font-black tracking-tight">Файно<br />натурально</a>
        <nav class="mt-3 space-y-1">
          <a routerLink="/admin/products" routerLinkActive="bg-[#f5b800] !text-[#2a1a0d]" class="block rounded-lg px-4 py-3 font-semibold text-[#f5ecd8] hover:bg-white/10">Товари</a>
          <a routerLink="/admin/orders" routerLinkActive="bg-[#f5b800] !text-[#2a1a0d]" class="block rounded-lg px-4 py-3 font-semibold text-[#f5ecd8] hover:bg-white/10">Замовлення</a>
          <a routerLink="/admin/categories" routerLinkActive="bg-[#f5b800] !text-[#2a1a0d]" class="block rounded-lg px-4 py-3 font-semibold text-[#f5ecd8] hover:bg-white/10">Категорії</a>
        </nav>
        <button type="button" class="mt-auto rounded-lg px-4 py-3 text-left font-semibold hover:bg-white/10" (click)="logout()">Вихід</button>
      </aside>

      <main class="min-w-0 flex-1">
        <header class="flex h-16 items-center justify-between border-b border-[#dac7a2] bg-white px-4 sm:px-7">
          <button type="button" class="rounded p-2 text-xl lg:hidden" aria-label="Відкрити меню" (click)="menuOpen.set(!menuOpen())">☰</button>
          <h1 class="text-lg font-black sm:text-xl">{{ title() }}</h1>
          <div class="flex items-center gap-3">
            <div class="hidden text-right sm:block"><p class="text-sm font-bold">{{ fullName() }}</p><p class="text-xs text-[#9c8461]">Адміністратор</p></div>
            <div class="grid h-9 w-9 place-items-center rounded-full border border-[#c48a00] bg-[#f5b800] text-sm font-black">{{ initials() }}</div>
          </div>
        </header>
        @if (menuOpen()) {
          <nav class="border-b border-[#dac7a2] bg-[#3b2412] p-3 text-[#fbf6ea] lg:hidden">
            <a routerLink="/admin/products" class="block rounded px-3 py-2" (click)="menuOpen.set(false)">Товари</a>
            <a routerLink="/admin/orders" class="block rounded px-3 py-2" (click)="menuOpen.set(false)">Замовлення</a>
            <a routerLink="/admin/categories" class="block rounded px-3 py-2" (click)="menuOpen.set(false)">Категорії</a>
            <button type="button" class="w-full rounded px-3 py-2 text-left" (click)="logout()">Вихід</button>
          </nav>
        }
        <section class="p-4 sm:p-7"><router-outlet /></section>
      </main>
    </div>
  `,
})
export class AdminShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly menuOpen = signal(false);
  readonly fullName = computed(() => `${this.auth.currentUser()?.firstName ?? ''} ${this.auth.currentUser()?.lastName ?? ''}`.trim() || 'Адміністратор');
  readonly initials = computed(() => this.fullName().split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase());
  readonly title = computed(() => {
    const url = this.router.url;
    if (url.includes('/orders')) return 'Замовлення';
    if (url.includes('/categories')) return 'Категорії';
    return url.includes('/new') || url.includes('/edit') ? 'Товар' : 'Товари';
  });

  logout(): void {
    this.auth.logout().subscribe(() => this.router.navigateByUrl('/catalog'));
  }
}
