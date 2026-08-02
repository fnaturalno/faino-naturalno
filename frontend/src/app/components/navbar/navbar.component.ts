import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { initialsOf } from '../../pages/auth/auth.helpers';
import { AuthService } from '../../services/auth.service';
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
          @if (auth.currentUser()?.isAdmin) {
            <a
              routerLink="/admin"
              routerLinkActive="text-[var(--cinnamon-700)]"
              class="font-semibold text-[var(--espresso-800)] hover:text-[var(--cinnamon-700)]"
            >Адмін</a>
          }
        </nav>

        <div class="flex items-center gap-1.5 sm:gap-2">
          @if (auth.isAuthenticated()) {
            <a
              routerLink="/profile"
              class="flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-0.5 text-[var(--espresso-800)] hover:opacity-90 sm:gap-3 sm:pl-2"
              [attr.aria-label]="'Профіль: ' + fullName()"
            >
              <div class="hidden text-right sm:block">
                <p class="text-sm font-bold leading-tight">{{ fullName() }}</p>
                <p class="text-xs text-[var(--kraft-500)]">{{ roleLabel() }}</p>
              </div>
              <span
                class="grid size-9 place-items-center rounded-full border border-[#c48a00] bg-[#f5b800] text-sm font-black text-[var(--espresso-900)]"
                aria-hidden="true"
              >{{ initials() }}</span>
            </a>
            <button
              type="button"
              class="hidden rounded-xl px-2.5 py-2 text-sm font-semibold text-[var(--espresso-800)] hover:text-[var(--chili-500)] sm:inline"
              [disabled]="loggingOut()"
              (click)="logout()"
            >
              Вихід
            </button>
            <button
              type="button"
              class="grid size-10 place-items-center rounded-xl bg-[var(--kraft-100)] text-[var(--espresso-800)] hover:text-[var(--chili-500)] sm:hidden"
              aria-label="Вихід"
              [disabled]="loggingOut()"
              (click)="logout()"
            >
              <app-icon name="log-out" [size]="20" />
            </button>
          } @else {
            <a
              routerLink="/auth/login"
              class="hidden rounded-xl px-3 py-2 text-sm font-semibold text-[var(--espresso-800)] hover:text-[var(--cinnamon-700)] sm:inline"
            >Увійти</a>
            <a
              routerLink="/auth/login"
              class="grid size-10 place-items-center rounded-xl bg-[var(--kraft-100)] text-[var(--espresso-800)] sm:hidden"
              aria-label="Увійти"
            >
              <app-icon name="user" [size]="20" />
            </a>
          }

          <button
            type="button"
            aria-label="Кошик"
            class="relative grid size-10 place-items-center rounded-xl bg-[var(--kraft-100)] text-[var(--espresso-800)]"
            (click)="onCartClick()"
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
      </div>

      @if (menuOpen()) {
        <nav aria-label="Мобільна навігація" class="flex flex-col border-t border-[var(--border-subtle)] bg-white px-4 py-3 sm:hidden">
          <a routerLink="/catalog" class="rounded-lg px-3 py-3 font-bold text-[var(--cinnamon-700)]">Каталог</a>
          <a href="#about" class="rounded-lg px-3 py-3 font-semibold">Про нас</a>
          <a href="#contacts" class="rounded-lg px-3 py-3 font-semibold">Контакти</a>
          @if (auth.currentUser()?.isAdmin) {
            <a routerLink="/admin" class="rounded-lg px-3 py-3 font-semibold">Адмін</a>
          }
          @if (auth.isAuthenticated()) {
            <a routerLink="/profile" class="flex items-center gap-3 rounded-lg px-3 py-3 font-semibold">
              <span
                class="grid size-9 place-items-center rounded-full border border-[#c48a00] bg-[#f5b800] text-sm font-black"
                aria-hidden="true"
              >{{ initials() }}</span>
              <span class="min-w-0">
                <span class="block truncate font-bold">{{ fullName() }}</span>
                <span class="block text-xs font-normal text-[var(--kraft-500)]">{{ roleLabel() }}</span>
              </span>
            </a>
            <button
              type="button"
              class="rounded-lg px-3 py-3 text-left font-semibold text-[var(--chili-500)]"
              [disabled]="loggingOut()"
              (click)="logout()"
            >
              Вихід
            </button>
          } @else {
            <a routerLink="/auth/login" class="rounded-lg px-3 py-3 font-semibold">Увійти</a>
          }
        </nav>
      }
    </header>
  `,
})
export class NavbarComponent {
  protected readonly cart = inject(CartService);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly menuOpen = signal(false);

  protected readonly fullName = computed(() => {
    const user = this.auth.currentUser();
    const name = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
    return name || 'Користувач';
  });

  protected readonly initials = computed(() => {
    const user = this.auth.currentUser();
    return user ? initialsOf(user.firstName, user.lastName) : '?';
  });

  protected readonly roleLabel = computed(() =>
    this.auth.currentUser()?.isAdmin ? 'Адміністратор' : 'Клієнт',
  );

  protected readonly loggingOut = signal(false);

  protected logout(): void {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    this.menuOpen.set(false);
    this.auth.logout().subscribe({
      next: () => {
        this.loggingOut.set(false);
        void this.router.navigateByUrl('/catalog');
      },
      error: () => {
        this.auth.clearSession();
        this.loggingOut.set(false);
        void this.router.navigateByUrl('/catalog');
      },
    });
  }

  /** Desktop: open drawer. Mobile: navigate to /cart. */
  protected onCartClick(): void {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
      this.cart.openDrawer();
      return;
    }
    void this.router.navigate(['/cart']);
  }
}
