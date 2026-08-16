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
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css',
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
