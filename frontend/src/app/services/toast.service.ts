import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  message: string;
  error: boolean;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastSignal = signal<ToastMessage | null>(null);
  private timer?: ReturnType<typeof setTimeout>;

  readonly toast = this.toastSignal.asReadonly();

  show(message: string, error = false): void {
    clearTimeout(this.timer);
    this.toastSignal.set({ message, error });
    this.timer = setTimeout(() => this.toastSignal.set(null), 3000);
  }

  success(message: string): void {
    this.show(message, false);
  }

  error(message: string): void {
    this.show(message, true);
  }

  dismiss(): void {
    clearTimeout(this.timer);
    this.toastSignal.set(null);
  }
}
