import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { IconComponent } from '../icon/icon.component';

const LEVELS = [1, 2, 3, 4, 5] as const;

/** Active flame color: 1–2 garden, 3–4 marigold, 5 chili. */
export function productStrengthColor(strength: number): string {
  if (strength >= 5) return 'var(--chili-500)';
  if (strength >= 3) return 'var(--marigold-400)';
  return 'var(--garden-500)';
}

@Component({
  selector: 'app-product-strength',
  imports: [IconComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    @if (shown(); as strength) {
      <div
        class="inline-flex items-center gap-0.5"
        role="img"
        [attr.aria-label]="'product.strengthAria' | transloco: { value: strength }"
      >
        @for (level of levels; track level) {
          <span
            class="inline-flex"
            [style.color]="level <= strength ? tone() : 'var(--kraft-300)'"
          >
            <app-icon name="flame" [size]="size()" [filled]="level <= strength" />
          </span>
        }
      </div>
    }
  `,
})
export class ProductStrengthComponent {
  readonly value = input<number | null | undefined>(null);
  readonly size = input(16);
  protected readonly levels = LEVELS;
  protected readonly shown = computed(() => {
    const strength = this.value();
    return strength != null && strength >= 1 && strength <= 5 ? strength : null;
  });
  protected readonly tone = computed(() => productStrengthColor(this.shown() ?? 1));
}
