import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { finalize } from 'rxjs';

import { IconComponent } from '../../components/icon/icon.component';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { PasswordStrengthComponent } from '../../components/password-strength/password-strength.component';
import { ToastHostComponent } from '../../components/toast-host/toast-host.component';
import { LocaleService } from '../../i18n/locale.service';
import { AuthService, extractApiError } from '../../services/auth.service';
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

function isTokenError(message: string): boolean {
  return /token|термін|застар|недійсн|invalid|expired|посиланн/i.test(message);
}

@Component({
  selector: 'app-reset-password',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NavbarComponent,
    ToastHostComponent,
    IconComponent,
    PasswordStrengthComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-navbar />
    <main class="flex min-h-[calc(100vh-60px)] items-start justify-center bg-[var(--bg-page)] px-4 py-10 sm:py-14">
      <div [class]="cardClasses">
        @if (!token()) {
          <div class="flex flex-col items-center text-center" role="alert">
            <h1 class="mb-3 text-xl sm:text-2xl">{{ 'auth.invalidLinkTitle' | transloco }}</h1>
            <p class="mb-6 text-sm text-[var(--chili-700)]">{{ 'auth.invalidLinkBody' | transloco }}</p>
            <a [routerLink]="locale.commands('auth', 'forgot-password')" [class]="linkClasses">
              {{ 'auth.requestNewLink' | transloco }}
            </a>
          </div>
        } @else if (done()) {
          <div class="flex flex-col items-center text-center" role="status">
            <div
              class="mb-[22px] grid size-20 place-items-center rounded-full bg-[var(--garden-500)] text-white"
              aria-hidden="true"
            >
              <app-icon name="check" [size]="38" />
            </div>
            <h1 class="mb-2 text-xl sm:text-2xl">{{ 'auth.passwordChangedTitle' | transloco }}</h1>
            <p class="mb-7 max-w-[280px] text-sm text-[var(--espresso-700)]">{{ 'auth.passwordChangedBody' | transloco }}</p>
            <a [routerLink]="locale.commands('auth', 'login')" [class]="primaryBtn">{{ 'auth.toLogin' | transloco }}</a>
          </div>
        } @else {
          <div class="mb-6 flex flex-col items-center text-center">
            <a [routerLink]="locale.commands('catalog')" [attr.aria-label]="'brand' | transloco">
              <img src="/logo.png" [alt]="'brand' | transloco" class="mb-[18px] h-[52px] w-auto" />
            </a>
            <h1 class="mb-2 text-xl sm:text-2xl">{{ 'auth.newPasswordTitle' | transloco }}</h1>
            <p class="text-sm text-[var(--espresso-700)]">{{ 'auth.newPasswordLead' | transloco }}</p>
          </div>

          <form class="flex flex-col gap-4" [formGroup]="form" (ngSubmit)="submit()">
            @if (formError()) {
              <div>
                <p role="alert" [class]="errorClasses">{{ formError() }}</p>
                @if (tokenInvalid()) {
                  <a
                    [routerLink]="locale.commands('auth', 'forgot-password')"
                    [class]="linkClasses + ' mt-2 inline-block text-sm'"
                    >{{ 'auth.requestNewLink' | transloco }}</a
                  >
                }
              </div>
            }

            <div class="flex flex-col gap-2">
              <div>
                <label for="reset-password" [class]="labelClasses">{{ 'auth.newPasswordLabel' | transloco }}</label>
                <input
                  id="reset-password"
                  type="password"
                  autocomplete="new-password"
                  formControlName="password"
                  [placeholder]="'auth.passwordPlaceholder' | transloco"
                  [class]="fieldClasses"
                  (input)="onPasswordInput()"
                />
                @if (form.controls.password.invalid && (form.controls.password.dirty || form.controls.password.touched)) {
                  <p [class]="errorClasses">{{ 'auth.passwordLen' | transloco }}</p>
                }
              </div>
              <app-password-strength [password]="passwordValue()" />
            </div>

            <div>
              <label for="reset-confirm" [class]="labelClasses">{{ 'auth.confirmPasswordLabel' | transloco }}</label>
              <input
                id="reset-confirm"
                type="password"
                autocomplete="new-password"
                formControlName="confirmPassword"
                placeholder="••••••••"
                [class]="fieldClasses"
              />
              @if (form.hasError('passwordMismatch') && (form.controls.confirmPassword.dirty || form.controls.confirmPassword.touched)) {
                <p [class]="errorClasses">{{ 'auth.passwordMismatch' | transloco }}</p>
              }
            </div>

            <button type="submit" [class]="primaryBtn" [disabled]="submitting()">
              @if (submitting()) {
                <span class="inline-block size-5 animate-spin rounded-full border-2 border-[var(--espresso-900)] border-t-transparent" aria-hidden="true"></span>
                {{ 'common.wait' | transloco }}
              } @else {
                {{ 'auth.resetSubmit' | transloco }}
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
  protected readonly locale = inject(LocaleService);
  private readonly i18n = inject(TranslocoService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly submitting = signal(false);
  protected readonly done = signal(false);
  protected readonly tokenInvalid = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly passwordValue = signal('');
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
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  protected onPasswordInput(): void {
    this.passwordValue.set(this.form.controls.password.value);
  }

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
            const message =
              response.error?.trim() || this.i18n.translate('auth.resetError') || 'Error';
            this.formError.set(message);
            if (isTokenError(message)) {
              this.tokenInvalid.set(true);
            }
            return;
          }
          this.done.set(true);
        },
        error: (err: unknown) => {
          const message = extractApiError(err, this.i18n.translate('auth.resetRetry'));
          this.formError.set(message);
          if (isTokenError(message)) {
            this.tokenInvalid.set(true);
          }
        },
      });
  }
}
