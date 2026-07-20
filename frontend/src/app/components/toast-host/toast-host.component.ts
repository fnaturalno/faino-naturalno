import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (toasts.toast(); as toastMessage) {
      <div
        role="status"
        aria-live="polite"
        class="fixed bottom-6 left-1/2 z-50 max-w-[min(90vw,420px)] -translate-x-1/2 rounded-[var(--radius-md)] px-5 py-3 text-center text-sm font-bold text-white shadow-[var(--shadow-lg)]"
        [class.bg-[var(--garden-700)]]="!toastMessage.error"
        [class.bg-[var(--chili-700)]]="toastMessage.error"
      >
        <button
          type="button"
          class="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-white/90 hover:text-white"
          aria-label="Закрити сповіщення"
          (click)="toasts.dismiss()"
        >
          ×
        </button>
        <span class="block pr-6">{{ toastMessage.message }}</span>
      </div>
    }
  `,
})
export class ToastHostComponent {
  protected readonly toasts = inject(ToastService);
}
