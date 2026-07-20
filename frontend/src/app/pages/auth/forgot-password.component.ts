import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { NavbarComponent } from '../../components/navbar/navbar.component';
import { ToastHostComponent } from '../../components/toast-host/toast-host.component';
import { AuthService, extractApiError } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import {
  AUTH_CARD_CLASSES,
  AUTH_ERROR_CLASSES,
  AUTH_FIELD_CLASSES,
  AUTH_LABEL_CLASSES,
  AUTH_LINK_CLASSES,
  AUTH_PRIMARY_BTN,
} from './auth.helpers';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, NavbarComponent, ToastHostComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-navbar />
    <main class="flex min-h-[calc(100vh-60px)] items-start justify-center bg-[var(--bg-page)] px-4 py-10 sm:py-14">
      <div [class]="cardClasses">
        <div class="flex flex-col items-center text-center">
          <a routerLink="/catalog" aria-label="Файно натурально">
            <img src="/logo.png" alt="Файно натурально" class="mb-5 h-14 w-auto sm:mb-6 sm:h-16" />
          </a>
          <h1 class="mb-1.5 text-xl sm:text-2xl">Забули пароль?</h1>
          <p class="mb-7 text-[var(--espresso-700)] sm:mb-8">
            Вкажіть електронну пошту — надішлемо лист для скидання пароля
          </p>
        </div>

        @if (sent()) {
          <div class="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--kraft-100)] p-4 text-center text-[var(--espresso-800)]" role="status">
            <p class="mb-3 font-semibold">Лист для скидання пароля надіслано</p>
            <p class="mb-4 text-sm text-[var(--espresso-700)]">
              Якщо акаунт з цією поштою існує, ви отримаєте інструкції. Перевірте також папку «Спам».
            </p>
            <a routerLink="/auth/login" [class]="linkClasses">Повернутися до входу</a>
          </div>
        } @else {
          <form class="flex flex-col gap-4" [formGroup]="form" (ngSubmit)="submit()">
            @if (formError()) {
              <p role="alert" [class]="errorClasses">{{ formError() }}</p>
            }
            <div>
              <label for="forgot-email" [class]="labelClasses">Ел. пошта</label>
              <input
                id="forgot-email"
                type="email"
                autocomplete="email"
                formControlName="email"
                placeholder="olena@example.com"
                [class]="fieldClasses"
              />
              @if (form.controls.email.invalid && (form.controls.email.dirty || form.controls.email.touched)) {
                <p [class]="errorClasses">Вкажіть коректну електронну пошту</p>
              }
            </div>
            <button type="submit" [class]="primaryBtn" [disabled]="submitting()">
              @if (submitting()) {
                <span class="inline-block size-5 animate-spin rounded-full border-2 border-[var(--espresso-900)] border-t-transparent" aria-hidden="true"></span>
                Зачекайте…
              } @else {
                Надіслати лист
              }
            </button>
          </form>
          <p class="mt-6 text-center text-[var(--espresso-700)]">
            <a routerLink="/auth/login" [class]="linkClasses">Повернутися до входу</a>
          </p>
        }
      </div>
    </main>
    <app-toast-host />
  `,
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly toasts = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly submitting = signal(false);
  protected readonly sent = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly cardClasses = AUTH_CARD_CLASSES;
  protected readonly fieldClasses = AUTH_FIELD_CLASSES;
  protected readonly labelClasses = AUTH_LABEL_CLASSES;
  protected readonly errorClasses = AUTH_ERROR_CLASSES;
  protected readonly primaryBtn = AUTH_PRIMARY_BTN;
  protected readonly linkClasses = AUTH_LINK_CLASSES;

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected submit(): void {
    this.formError.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.auth
      .forgotPassword({ email: this.form.controls.email.value.trim() })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: (response) => {
          if (!response.success) {
            this.formError.set(response.error ?? 'Не вдалося надіслати лист.');
            return;
          }
          this.sent.set(true);
          this.toasts.success('Лист для скидання пароля надіслано');
        },
        error: (err: unknown) => {
          this.formError.set(extractApiError(err, 'Не вдалося надіслати лист. Спробуйте ще раз.'));
        },
      });
  }
}
