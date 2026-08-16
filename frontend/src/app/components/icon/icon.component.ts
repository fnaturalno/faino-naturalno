import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type IconName =
  | 'bag'
  | 'check'
  | 'check-circle'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'clock'
  | 'close'
  | 'corner-down-right'
  | 'filter'
  | 'flame'
  | 'image-off'
  | 'key-round'
  | 'leaf'
  | 'lock'
  | 'log-out'
  | 'mail-check'
  | 'map-pin'
  | 'menu'
  | 'package'
  | 'pencil'
  | 'plus'
  | 'search'
  | 'shopping-basket'
  | 'trash'
  | 'truck'
  | 'user'
  | 'x-circle';

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0' },
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.css',
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input(20);
  readonly filled = input(false);
}
