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
  templateUrl: './test-mode-banner.component.html',
  styleUrl: './test-mode-banner.component.css',
})
export class TestModeBannerComponent {
  /** Even count so -50% translate loops seamlessly. */
  protected readonly copies = [0, 1, 2, 3, 4, 5, 6, 7] as const;
}
