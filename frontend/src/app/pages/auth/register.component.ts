import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { finalize } from 'rxjs';

import { NavbarComponent } from '../../components/navbar/navbar.component';
import { ToastHostComponent } from '../../components/toast-host/toast-host.component';
import { LocaleService } from '../../i18n/locale.service';
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

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, NavbarComponent, ToastHostComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-navbar />
    <main class="flex min-h-[calc(100vh-60px)] items-start justify-center bg-[var(--bg-page)] px-4 py-10 sm:py-14">
      <div [class]="cardClasses">
        <div class="flex flex-col items-center text-center">
          <a [routerLink]="locale.commands('catalog')" [attr.aria-label]="'brand' | transloco">
            <img src="/logo.png" [alt]="'brand' | transloco" class="mb-5 h-14 w-auto sm:mb-6 sm:h-16" />
          </a>
          <h1 class="mb-1.5 text-xl sm:text-2xl">{{ 'auth.joinTitle' | transloco }}</h1>
          <p class="mb-7 text-[var(--espresso-700)] sm:mb-8">{{ 'auth.joinLead' | transloco }}</p>
        </div>

        <form class="flex flex-col gap-4" [formGroup]="form" (ngSubmit)="submit()">
          @if (formError()) {
            <p role="alert" [class]="errorClasses">{{ formError() }}</p>
          }

          <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label for="reg-first" [class]="labelClasses">{{ 'auth.firstName' | transloco }}</label>
              <input id="reg-first" type="text" autocomplete="given-name" formControlName="firstName" [placeholder]="'auth.firstNamePh' | transloco" [class]="fieldClasses" />
              @if (showError('firstName')) {
                <p [class]="errorClasses">{{ 'auth.reqFirstName' | transloco }}</p>
              }
            </div>
            <div>
              <label for="reg-last" [class]="labelClasses">{{ 'auth.lastName' | transloco }}</label>
              <input id="reg-last" type="text" autocomplete="family-name" formControlName="lastName" [placeholder]="'auth.lastNamePh' | transloco" [class]="fieldClasses" />
              @if (showError('lastName')) {
                <p [class]="errorClasses">{{ 'auth.reqLastName' | transloco }}</p>
              }
            </div>
          </div>

          <div>
            <label for="reg-email" [class]="labelClasses">{{ 'auth.email' | transloco }}</label>
            <input id="reg-email" type="email" autocomplete="email" formControlName="email" placeholder="olena@example.com" [class]="fieldClasses" />
            @if (showError('email')) {
              <p [class]="errorClasses">{{ emailError() }}</p>
            }
          </div>

          <div>
            <label for="reg-password" [class]="labelClasses">{{ 'auth.password' | transloco }}</label>
            <input id="reg-password" type="password" autocomplete="new-password" formControlName="password" [placeholder]="'auth.passwordPlaceholder' | transloco" [class]="fieldClasses" />
            @if (showError('password')) {
              <p [class]="errorClasses">{{ 'auth.passwordMin8' | transloco }}</p>
            }
          </div>

          <div>
            <label for="reg-confirm" [class]="labelClasses">{{ 'auth.confirmPasswordLabel' | transloco }}</label>
            <input id="reg-confirm" type="password" autocomplete="new-password" formControlName="confirmPassword" placeholder="••••••••" [class]="fieldClasses" />
            @if (form.hasError('passwordMismatch') && (form.controls.confirmPassword.dirty || form.controls.confirmPassword.touched)) {
              <p [class]="errorClasses">{{ 'auth.passwordMismatch' | transloco }}</p>
            }
          </div>

          <button type="submit" [class]="primaryBtn" [disabled]="submitting()">
            @if (submitting()) {
              <span class="inline-block size-5 animate-spin rounded-full border-2 border-[var(--espresso-900)] border-t-transparent" aria-hidden="true"></span>
              {{ 'common.wait' | transloco }}
            } @else {
              {{ 'auth.registerCta' | transloco }}
            }
          </button>
        </form>

        <p class="mt-6 text-center text-[var(--espresso-700)]">
          {{ 'auth.hasAccountQ' | transloco }}
          <a [routerLink]="locale.commands('auth', 'login')" [queryParams]="loginLinkQuery()" [class]="linkClasses">{{ 'auth.toLogin' | transloco }}</a>
        </p>
      </div>
    </main>
    <app-toast-host />
  `,
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  protected readonly locale = inject(LocaleService);
  private readonly i18n = inject(TranslocoService);
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

  protected readonly form = this.fb.nonNullable.group(
    {
      firstName: ['', [Validators.required, Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(256)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  protected showError(control: 'firstName' | 'lastName' | 'email' | 'password'): boolean {
    const c = this.form.controls[control];
    return c.invalid && (c.dirty || c.touched);
  }

  protected emailError(): string {
    if (this.form.controls.email.hasError('emailTaken')) {
      return this.i18n.translate('auth.emailTaken');
    }
    return this.i18n.translate('auth.invalidEmail');
  }

  protected loginLinkQuery(): Record<string, string> | null {
    return returnUrlQueryParams(this.route.snapshot.queryParamMap.get('returnUrl'));
  }

  protected submit(): void {
    this.formError.set(null);
    const emailCtrl = this.form.controls.email;
    if (emailCtrl.hasError('emailTaken')) {
      const { emailTaken: _emailTaken, ...rest } = emailCtrl.errors ?? {};
      void _emailTaken;
      emailCtrl.setErrors(Object.keys(rest).length ? rest : null);
    }

    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    const value = this.form.getRawValue();
    this.auth
      .register({
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
        email: value.email.trim(),
        password: value.password,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: (response) => {
          if (!response.success || !response.data) {
            const message =
              response.error?.trim() || this.i18n.translate('auth.registerError') || 'Error';
            if (/email|пошт/i.test(message)) {
              this.form.controls.email.setErrors({ emailTaken: true });
            } else {
              this.formError.set(message);
            }
            return;
          }
          this.toasts.success(this.i18n.translate('auth.registerSuccess'));
          void this.router.navigateByUrl(
            resolveReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')),
          );
        },
        error: (err: unknown) => {
          const message = extractApiError(err, this.i18n.translate('auth.registerRetry'));
          if (/email|пошт|already|існує/i.test(message)) {
            this.form.controls.email.setErrors({ emailTaken: true });
          } else {
            this.formError.set(message);
          }
        },
      });
  }
}
