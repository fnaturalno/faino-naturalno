import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { NavbarComponent } from '../../components/navbar/navbar.component';

@Component({
  selector: 'app-order-placeholder',
  imports: [NavbarComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-navbar />
    <main class="grid min-h-[calc(100vh-76px)] place-items-center bg-[var(--bg-page)] px-6 text-center">
      <div>
        <p class="fn-eyebrow mb-3">Замовлення</p>
        <h1 class="mb-2 text-2xl">Замовлення №{{ id() }}</h1>
        <p class="mb-6 text-[var(--espresso-700)]">Сторінка деталей з’явиться незабаром</p>
        <a
          routerLink="/profile"
          class="inline-flex rounded-lg bg-[var(--marigold-400)] px-5 py-3 font-extrabold text-[var(--espresso-900)]"
        >
          До профілю
        </a>
      </div>
    </main>
  `,
})
export class OrderPlaceholderComponent {
  readonly id = input.required<string>();
}
