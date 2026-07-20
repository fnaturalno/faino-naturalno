import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
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

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-reset-password',
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
          <h1 class="mb-1.5 text-xl sm:text-2xl">Новий пароль</h1>
          <p class="mb-7 text-[var(--espresso-700)] sm:mb-8">Оберіть надійний пароль для свого акаунту</p>
        </div>

        @if (!token()) {
          <div class="text-center" role="alert">
            <p class="mb-4 text-[var(--chili-700)]">
              Посилання для скидання пароля недійсне або застаріле.
            </p>
            <a routerLink="/auth/forgot-password" [class]="linkClasses">Запросити новий лист</a>
          </div>
        } @else if (done()) {
          <div class="text-center" role="status">
            <p class="mb-4 font-semibold text-[var(--garden-700)]">Пароль оновлено</p>
            <a routerLink="/auth/login" [class]="linkClasses">Увійти</a>
          </div>
        } @else {
          <form class="flex flex-col gap-4" [formGroup]="form" (ngSubmit)="submit()">
            @if (formError()) {
              <p role="alert" [class]="errorClasses">{{ formError() }}</p>
              @if (tokenInvalid()) {
                <a routerLink="/auth/forgot-password" [class]="linkClasses + ' text-sm'">Запросити новий лист</a>
              }
            }
            <div>
              <label for="reset-password" [class]="labelClasses">Новий пароль</label>
              <input
                id="reset-password"
                type="password"
                autocomplete="new-password"
                formControlName="password"
                placeholder="Мінімум 8 символів"
                [class]="fieldClasses"
              />
              @if (form.controls.password.invalid && (form.controls.password.dirty || form.controls.password.touched)) {
                <p [class]="errorClasses">Пароль має містити щонайменше 8 символів</p>
              }
            </div>
            <div>
              <label for="reset-confirm" [class]="labelClasses">Підтвердіть пароль</label>
              <input
                id="reset-confirm"
                type="password"
                autocomplete="new-password"
                formControlName="confirmPassword"
                placeholder="••••••••"
                [class]="fieldClasses"
              />
              @if (form.hasError('passwordMismatch') && (form.controls.confirmPassword.dirty || form.controls.confirmPassword.touched)) {
                <p [class]="errorClasses">Паролі не збігаються</p>
              }
            </div>
            <button type="submit" [class]="primaryBtn" [disabled]="submitting()">
              @if (submitting()) {
                <span class="inline-block size-5 animate-spin rounded-full border-2 border-[var(--espresso-900)] border-t-transparent" aria-hidden="true"></span>
                Зачекайте…
              } @else {
                Зберегти пароль
              }
            </button>
          </form>
        }
      </div>
    </main>
    <app-toast-host />
  `,
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly toasts = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly submitting = signal(false);
  protected readonly done = signal(false);
  protected readonly tokenInvalid = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly token = signal(
    this.route.snapshot.queryParamMap.get('token') ??
      this.route.snapshot.paramMap.get('token') ??
      '',
  );

  protected readonly cardClasses = AUTH_CARD_CLASSES;
  protected readonly fieldClasses = AUTH_FIELD_CLASSES;
  protected readonly labelClasses = AUTH_LABEL_CLASSES;
  protected readonly errorClasses = AUTH_ERROR_CLASSES;
  protected readonly primaryBtn = AUTH_PRIMARY_BTN;
  protected readonly linkClasses = AUTH_LINK_CLASSES;

  protected readonly form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  protected submit(): void {
    this.formError.set(null);
    this.tokenInvalid.set(false);
    this.form.markAllAsTouched();
    if (!this.token() || this.form.invalid || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.auth
      .resetPassword({ token: this.token(), password: this.form.controls.password.value })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: (response) => {
          if (!response.success) {
            const message = response.error ?? 'Не вдалося оновити пароль.';
            this.formError.set(message);
            if (/token|термін|застар|недійсн|invalid|expired/i.test(message)) {
              this.tokenInvalid.set(true);
            }
            return;
          }
          this.done.set(true);
          this.toasts.success('Пароль оновлено');
        },
        error: (err: unknown) => {
          const message = extractApiError(err, 'Не вдалося оновити пароль. Спробуйте ще раз.');
          this.formError.set(message);
          if (/token|термін|застар|недійсн|invalid|expired/i.test(message)) {
            this.tokenInvalid.set(true);
          }
        },
      });
  }
}
