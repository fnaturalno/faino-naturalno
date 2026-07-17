import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type IconName =
  | 'bag'
  | 'check'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'close'
  | 'filter'
  | 'menu'
  | 'package';

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0' },
  template: `
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      viewBox="0 0 24 24"
      [attr.width]="size()"
      [attr.height]="size()"
    >
      @switch (name()) {
        @case ('bag') {
          <path d="M6 8h12l1 13H5L6 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" />
        }
        @case ('check') { <path d="m5 12 4 4L19 6" /> }
        @case ('chevron-down') { <path d="m6 9 6 6 6-6" /> }
        @case ('chevron-left') { <path d="m15 18-6-6 6-6" /> }
        @case ('chevron-right') { <path d="m9 18 6-6-6-6" /> }
        @case ('close') { <path d="M18 6 6 18M6 6l12 12" /> }
        @case ('filter') { <path d="M4 6h16M7 12h10M10 18h4" /> }
        @case ('menu') { <path d="M4 7h16M4 12h16M4 17h16" /> }
        @case ('package') {
          <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
          <path d="m4.5 7.5 7.5 4 7.5-4M12 11.5V21M16 4.8 8.5 9" />
          <circle cx="18" cy="18" r="3" fill="var(--kraft-100)" />
          <path d="m20.2 20.2 1.8 1.8" />
        }
      }
    </svg>
  `,
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input(20);
}
