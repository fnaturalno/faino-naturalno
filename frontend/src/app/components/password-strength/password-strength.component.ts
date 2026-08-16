import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

import { passwordStrength } from '../../pages/auth/auth.helpers';

@Component({
  selector: 'app-password-strength',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './password-strength.component.html',
  styleUrl: './password-strength.component.css',
})
export class PasswordStrengthComponent {
  readonly password = input.required<string>();
  private readonly i18n = inject(TranslocoService);

  protected readonly meter = computed(() =>
    passwordStrength(this.password(), {
      weak: this.i18n.translate('auth.strengthWeak'),
      medium: this.i18n.translate('auth.strengthMedium'),
      strong: this.i18n.translate('auth.strengthStrong'),
    }),
  );
}
