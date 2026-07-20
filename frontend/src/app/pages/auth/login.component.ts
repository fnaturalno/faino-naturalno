import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
  resolveReturnUrl,
  returnUrlQueryParams,
} from './auth.helpers';

@Component({
  selector: 'app-login',
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
          <h1 class="mb-1.5 text-xl sm:text-2xl">З поверненням!</h1>
          <p class="mb-7 text-[var(--espresso-700)] sm:mb-8">Увійдіть, щоб продовжити покупки смачного</p>
        </div>

        <form class="flex flex-col gap-4" [formGroup]="form" (ngSubmit)="submit()">
          @if (formError()) {
            <p role="alert" [class]="errorClasses">{{ formError() }}</p>
          }

          <div>
            <label for="login-email" [class]="labelClasses">Ел. пошта</label>
            <input
              id="login-email"
              type="email"
              autocomplete="email"
              formControlName="email"
              placeholder="olena@example.com"
              [class]="fieldClasses"
            />
            @if (showError('email')) {
              <p [class]="errorClasses">Вкажіть коректну електронну пошту</p>
            }
          </div>

          <div>
            <div class="mb-1.5 flex items-center justify-between gap-3">
              <label for="login-password" [class]="labelClasses + ' !mb-0'">Пароль</label>
              <a routerLink="/auth/forgot-password" [class]="linkClasses + ' text-sm'">Забули пароль?</a>
            </div>
            <input
              id="login-password"
              type="password"
              autocomplete="current-password"
              formControlName="password"
              placeholder="••••••••"
              [class]="fieldClasses"
            />
            @if (showError('password')) {
              <p [class]="errorClasses">Введіть пароль</p>
            }
          </div>

          <button type="submit" [class]="primaryBtn" [disabled]="submitting()">
            @if (submitting()) {
              <span class="inline-block size-5 animate-spin rounded-full border-2 border-[var(--espresso-900)] border-t-transparent" aria-hidden="true"></span>
              Зачекайте…
            } @else {
              Увійти
            }
          </button>
        </form>

        <div class="my-6 flex items-center gap-3.5">
          <span class="h-px flex-1 bg-[var(--border-subtle)]"></span>
          <span class="text-sm text-[var(--text-muted)]">або</span>
          <span class="h-px flex-1 bg-[var(--border-subtle)]"></span>
        </div>

        <p class="text-center text-[var(--espresso-700)]">
          Немає акаунту?
          <a
            routerLink="/auth/register"
            [queryParams]="registerLinkQuery()"
            [class]="linkClasses"
          >Зареєструватись</a>
        </p>
      </div>
    </main>
    <app-toast-host />
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toasts = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly cardClasses = AUTH_CARD_CLASSES;
  protected readonly fieldClasses = AUTH_FIELD_CLASSES;
  protected readonly labelClasses = AUTH_LABEL_CLASSES;
  protected readonly errorClasses = AUTH_ERROR_CLASSES;
  protected readonly primaryBtn = AUTH_PRIMARY_BTN;
  protected readonly linkClasses = AUTH_LINK_CLASSES;

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected showError(control: 'email' | 'password'): boolean {
    const c = this.form.controls[control];
    return c.invalid && (c.dirty || c.touched);
  }

  protected registerLinkQuery(): Record<string, string> | null {
    return returnUrlQueryParams(this.route.snapshot.queryParamMap.get('returnUrl'));
  }

  protected submit(): void {
    this.formError.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    const { email, password } = this.form.getRawValue();
    this.auth
      .login({ email: email.trim(), password })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: (response) => {
          if (!response.success || !response.data) {
            this.formError.set(response.error ?? 'Не вдалося увійти. Перевірте дані.');
            return;
          }
          this.toasts.success('Ви увійшли');
          void this.router.navigateByUrl(this.returnUrl());
        },
        error: (err: unknown) => {
          this.formError.set(extractApiError(err, 'Не вдалося увійти. Спробуйте ще раз.'));
        },
      });
  }

  private returnUrl(): string {
    return resolveReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));
  }
}
