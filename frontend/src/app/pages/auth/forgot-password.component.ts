import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { finalize } from 'rxjs';

import { IconComponent } from '../../components/icon/icon.component';
import { NavbarComponent } from '../../components/navbar/navbar.component';
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
  AUTH_SECONDARY_BTN,
} from './auth.helpers';

@Component({
  selector: 'app-forgot-password',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NavbarComponent,
    ToastHostComponent,
    IconComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-navbar />
    <main class="flex min-h-[calc(100vh-60px)] items-start justify-center bg-[var(--bg-page)] px-4 py-10 sm:py-14">
      <div [class]="cardClasses">
        @if (step() === 'request') {
          <div class="mb-6 flex flex-col items-center text-center">
            <div
              class="mb-5 grid size-[72px] place-items-center rounded-full bg-[var(--marigold-100)] text-[var(--cinnamon-700)]"
              aria-hidden="true"
            >
              <app-icon name="key-round" [size]="30" />
            </div>
            <h1 class="mb-2 text-xl sm:text-2xl">{{ 'auth.forgotHeading' | transloco }}</h1>
            <p class="text-sm text-[var(--espresso-700)]">{{ 'auth.forgotLead' | transloco }}</p>
          </div>

          <form class="flex flex-col gap-4" [formGroup]="form" (ngSubmit)="submit()">
            @if (formError()) {
              <p role="alert" [class]="errorClasses">{{ formError() }}</p>
            }
            <div>
              <label for="forgot-email" [class]="labelClasses">{{ 'auth.email' | transloco }}</label>
              <input
                id="forgot-email"
                type="email"
                autocomplete="email"
                formControlName="email"
                placeholder="olena@example.com"
                [class]="fieldClasses"
              />
              @if (form.controls.email.invalid && (form.controls.email.dirty || form.controls.email.touched)) {
                <p [class]="errorClasses">{{ 'auth.invalidEmail' | transloco }}</p>
              }
            </div>
            <button type="submit" [class]="primaryBtn" [disabled]="submitting()">
              @if (submitting()) {
                <span class="inline-block size-5 animate-spin rounded-full border-2 border-[var(--espresso-900)] border-t-transparent" aria-hidden="true"></span>
                {{ 'common.wait' | transloco }}
              } @else {
                {{ 'auth.forgotSubmit' | transloco }}
              }
            </button>
          </form>
          <p class="mt-5 text-center">
            <a [routerLink]="locale.commands('auth', 'login')" [class]="linkClasses + ' text-sm'">{{
              'auth.backToLogin' | transloco
            }}</a>
          </p>
        } @else {
          <div class="flex flex-col items-center text-center" role="status">
            <div
              class="mb-5 grid size-[72px] place-items-center rounded-full bg-[var(--garden-100)] text-[var(--garden-700)]"
              aria-hidden="true"
            >
              <app-icon name="mail-check" [size]="30" />
            </div>
            <h1 class="mb-2 text-xl sm:text-2xl">{{ 'auth.checkEmailTitle' | transloco }}</h1>
            <p class="mb-1.5 text-sm text-[var(--espresso-700)]">{{ 'auth.checkEmailLead' | transloco }}</p>
            <p
              class="mb-5 max-w-full truncate font-bold text-[var(--espresso-900)]"
              [title]="submittedEmail()"
            >{{ submittedEmail() }}</p>

            <div
              class="mb-5 w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-cream)] px-4 py-3.5 text-left"
            >
              <p class="text-sm leading-relaxed text-[var(--espresso-700)]">{{ 'auth.checkEmailHint' | transloco }}</p>
            </div>

            @if (formError()) {
              <p role="alert" class="mb-3 w-full text-left" [class]="errorClasses">{{ formError() }}</p>
            }

            <button type="button" [class]="secondaryBtn" [disabled]="submitting()" (click)="resend()">
              @if (submitting()) {
                <span class="inline-block size-5 animate-spin rounded-full border-2 border-[var(--espresso-900)] border-t-transparent" aria-hidden="true"></span>
                {{ 'common.wait' | transloco }}
              } @else {
                {{ 'auth.resendLink' | transloco }}
              }
            </button>

            <p class="mt-[18px]">
              <a [routerLink]="locale.commands('auth', 'login')" [class]="linkClasses + ' text-sm'">{{
                'auth.backToLogin' | transloco
              }}</a>
            </p>
          </div>
        }
      </div>
    </main>
    <app-toast-host />
  `,
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  protected readonly locale = inject(LocaleService);
  private readonly i18n = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly submitting = signal(false);
  protected readonly step = signal<'request' | 'sent'>('request');
  protected readonly submittedEmail = signal('');
  protected readonly formError = signal<string | null>(null);
  protected readonly cardClasses = AUTH_CARD_CLASSES;
  protected readonly fieldClasses = AUTH_FIELD_CLASSES;
  protected readonly labelClasses = AUTH_LABEL_CLASSES;
  protected readonly errorClasses = AUTH_ERROR_CLASSES;
  protected readonly primaryBtn = AUTH_PRIMARY_BTN;
  protected readonly secondaryBtn = AUTH_SECONDARY_BTN;
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

    const email = this.form.controls.email.value.trim();
    this.sendForgot(email, true);
  }

  protected resend(): void {
    const email = this.submittedEmail();
    if (!email || this.submitting()) {
      return;
    }
    this.sendForgot(email, false);
  }

  private sendForgot(email: string, advanceToSent: boolean): void {
    this.formError.set(null);
    this.submitting.set(true);
    this.auth
      .forgotPassword({ email })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: (response) => {
          if (!response.success) {
            this.formError.set(response.error ?? this.i18n.translate('auth.forgotError'));
            return;
          }
          this.submittedEmail.set(email);
          if (advanceToSent) {
            this.step.set('sent');
          }
        },
        error: (err: unknown) => {
          this.formError.set(extractApiError(err, this.i18n.translate('auth.forgotRetry')));
        },
      });
  }
}
