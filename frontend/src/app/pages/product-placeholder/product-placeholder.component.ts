import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { NavbarComponent } from '../../components/navbar/navbar.component';

@Component({
  selector: 'app-product-placeholder',
  imports: [NavbarComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-navbar />
    <main class="grid min-h-[calc(100vh-76px)] place-items-center bg-[var(--bg-page)] px-6 text-center">
      <div>
        <p class="fn-eyebrow mb-3">Сторінка товару</p>
        <h1 class="mb-4 text-2xl">Деталі товару з’являться незабаром</h1>
        <a routerLink="/catalog" class="inline-flex rounded-lg bg-[var(--marigold-400)] px-5 py-3 font-extrabold text-[var(--espresso-900)]">
          Повернутися до каталогу
        </a>
      </div>
    </main>
  `,
})
export class ProductPlaceholderComponent {}
