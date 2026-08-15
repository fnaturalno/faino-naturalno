import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { AdminService } from '../../services/admin.service';
import { extractApiError } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin-settings',
  imports: [ReactiveFormsModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="h-48 animate-pulse rounded-xl bg-[#f5ecd8]"></div>
    } @else {
      <form class="mx-auto max-w-xl space-y-5" [formGroup]="form" (ngSubmit)="save()">
        <section class="rounded-xl border border-[#dac7a2] bg-white p-5">
          <h2 class="mb-2 font-black">{{ 'admin.ukrFreeTitle' | transloco }}</h2>
          <p class="mb-4 text-sm text-[#9c8461]">{{ 'admin.ukrFreeHint' | transloco }}</p>
          <label class="block text-sm font-bold">
            {{ 'admin.ukrFreeAmount' | transloco }}
            <input
              formControlName="ukrposhtaFreeFromAmount"
              type="number"
              min="1"
              step="1"
              class="mt-1 w-full rounded-lg border border-[#c2ab80] p-3 font-normal"
            />
          </label>
          @if (invalidAmount()) {
            <p class="mt-1 text-xs text-[#b23a2e]">{{ 'admin.ukrFreeInvalid' | transloco }}</p>
          }
        </section>
        <button
          type="submit"
          class="rounded-lg bg-[#f5b800] px-4 py-3 font-bold disabled:opacity-50"
          [disabled]="saving()"
        >
          {{ saving() ? ('common.saving' | transloco) : ('common.save' | transloco) }}
        </button>
      </form>
    }
  `,
})
export class AdminSettingsComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly saving = signal(false);

  readonly form = this.fb.group({
    ukrposhtaFreeFromAmount: [1300, [Validators.required, Validators.min(1)]],
  });

  constructor() {
    this.admin
      .getSettings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.form.patchValue({
              ukrposhtaFreeFromAmount: response.data.ukrposhtaFreeFromAmount,
            });
          } else {
            this.toast.error(response.error ?? this.i18n.translate('admin.settingsLoadError'));
          }
          this.loading.set(false);
        },
        error: (error) => {
          this.toast.error(extractApiError(error, this.i18n.translate('admin.settingsLoadError')));
          this.loading.set(false);
        },
      });
  }

  protected invalidAmount(): boolean {
    const control = this.form.controls.ukrposhtaFreeFromAmount;
    return control.invalid && (control.touched || this.saving());
  }

  protected save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.admin
      .updateSettings({ ukrposhtaFreeFromAmount: this.form.getRawValue().ukrposhtaFreeFromAmount })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.saving.set(false);
          if (response.success) {
            this.toast.success(this.i18n.translate('admin.settingsSaved'));
            this.form.patchValue({
              ukrposhtaFreeFromAmount: response.data.ukrposhtaFreeFromAmount,
            });
          } else {
            this.toast.error(response.error ?? this.i18n.translate('admin.settingsSaveError'));
          }
        },
        error: (error) => {
          this.saving.set(false);
          this.toast.error(extractApiError(error, this.i18n.translate('admin.settingsSaveError')));
        },
      });
  }
}
