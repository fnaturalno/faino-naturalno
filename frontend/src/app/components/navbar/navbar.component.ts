import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { CartService } from '../../services/cart.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-white">
      <div class="mx-auto flex h-[60px] max-w-[1280px] items-center justify-between px-4 sm:h-[68px] sm:px-6 lg:h-[76px] lg:px-8">
        <button
          type="button"
          class="grid size-10 place-items-center rounded-lg text-[var(--espresso-800)] sm:hidden"
          aria-label="Відкрити меню"
          [attr.aria-expanded]="menuOpen()"
          (click)="menuOpen.update((open) => !open)"
        >
          <app-icon name="menu" [size]="22" />
        </button>

        <a routerLink="/catalog" aria-label="Файно натурально — каталог" class="shrink-0">
          <img src="/logo.png" alt="Файно натурально" class="h-[36px] w-auto sm:h-[42px] lg:h-[46px]" />
        </a>

        <nav aria-label="Основна навігація" class="hidden items-center gap-6 sm:flex lg:gap-8">
          <a
            routerLink="/catalog"
            routerLinkActive="text-[var(--cinnamon-700)]"
            class="font-semibold text-[var(--espresso-800)] hover:text-[var(--cinnamon-700)]"
          >Каталог</a>
          <a href="#about" class="font-semibold text-[var(--espresso-800)] hover:text-[var(--cinnamon-700)]">Про нас</a>
          <a href="#contacts" class="font-semibold text-[var(--espresso-800)] hover:text-[var(--cinnamon-700)]">Контакти</a>
        </nav>

        <button
          type="button"
          aria-label="Кошик"
          class="relative grid size-10 place-items-center rounded-xl bg-[var(--kraft-100)] text-[var(--espresso-800)]"
        >
          <app-icon name="bag" [size]="20" />
          @if (cart.itemCount() > 0) {
            <span
              class="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-[var(--chili-500)] px-1 text-[10px] font-extrabold text-white"
              aria-label="{{ cart.itemCount() }} товарів у кошику"
            >{{ cart.itemCount() }}</span>
          }
        </button>
      </div>

      @if (menuOpen()) {
        <nav aria-label="Мобільна навігація" class="flex flex-col border-t border-[var(--border-subtle)] bg-white px-4 py-3 sm:hidden">
          <a routerLink="/catalog" class="rounded-lg px-3 py-3 font-bold text-[var(--cinnamon-700)]">Каталог</a>
          <a href="#about" class="rounded-lg px-3 py-3 font-semibold">Про нас</a>
          <a href="#contacts" class="rounded-lg px-3 py-3 font-semibold">Контакти</a>
        </nav>
      }
    </header>
  `,
})
export class NavbarComponent {
  protected readonly cart = inject(CartService);
  protected readonly menuOpen = signal(false);
}
