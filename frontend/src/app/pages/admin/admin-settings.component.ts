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
  templateUrl: './admin-settings.component.html',
  styleUrl: './admin-settings.component.css',
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
