import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-test-mode-banner',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'sticky top-0 z-40 block',
    role: 'status',
  },
  template: `
    <div
      class="fn-test-banner h-8 overflow-hidden border-b border-[var(--marigold-600)] bg-[var(--marigold-400)] text-[var(--espresso-900)]"
      [attr.aria-label]="'common.testMode' | transloco"
    >
      <div class="fn-test-banner__track flex h-full w-max items-center whitespace-nowrap text-[11px] font-extrabold uppercase tracking-[0.14em] sm:text-xs">
        @for (i of copies; track i) {
          <span class="inline-flex items-center gap-3 px-4">
            <span aria-hidden="true">●</span>
            {{ 'common.testMode' | transloco }}
          </span>
        }
      </div>
    </div>
  `,
  styles: `
    .fn-test-banner__track {
      animation: fn-test-marquee 28s linear infinite;
    }

    @media (prefers-reduced-motion: reduce) {
      .fn-test-banner__track {
        animation: none;
        justify-content: center;
        width: 100%;
      }
    }

    @keyframes fn-test-marquee {
      from {
        transform: translateX(0);
      }
      to {
        transform: translateX(-50%);
      }
    }
  `,
})
export class TestModeBannerComponent {
  /** Even count so -50% translate loops seamlessly. */
  protected readonly copies = [0, 1, 2, 3, 4, 5, 6, 7] as const;
}
