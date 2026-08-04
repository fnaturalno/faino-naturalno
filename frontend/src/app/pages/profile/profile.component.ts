import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
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
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Subject, debounceTime, distinctUntilChanged, finalize, of, switchMap } from 'rxjs';

import { IconComponent } from '../../components/icon/icon.component';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { PasswordStrengthComponent } from '../../components/password-strength/password-strength.component';
import { ToastHostComponent } from '../../components/toast-host/toast-host.component';
import { LocaleService } from '../../i18n/locale.service';
import {
  DeliveryAddressDto,
  NpBranch,
  NpCity,
  OrderSummary,
} from '../../models/auth.models';
import { AuthService, extractApiError } from '../../services/auth.service';
import { OrderService } from '../../services/order.service';
import { ShippingService } from '../../services/shipping.service';
import { ToastService } from '../../services/toast.service';
import {
  AUTH_ERROR_CLASSES,
  AUTH_FIELD_CLASSES,
  AUTH_LABEL_CLASSES,
  AUTH_LINK_CLASSES,
  initialsOf,
  isValidUaPhone,
  memberSinceYear,
  normalizePhone,
  orderStatusLabel,
  orderStatusTone,
} from '../auth/auth.helpers';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('newPassword')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
}

function passwordsDiffer(group: AbstractControl): ValidationErrors | null {
  const current = group.get('currentPassword')?.value;
  const next = group.get('newPassword')?.value;
  return current && next && current === next ? { passwordSame: true } : null;
}

@Component({
  selector: 'app-profile',
  imports: [TranslocoPipe, 
    ReactiveFormsModule,
    RouterLink,
    NavbarComponent,
    ToastHostComponent,
    IconComponent,
    PasswordStrengthComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile.component.html',
})
export class ProfileComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly locale = inject(LocaleService);
  private readonly i18n = inject(TranslocoService);
  private readonly ordersApi = inject(OrderService);
  private readonly shipping = inject(ShippingService);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cityQuery$ = new Subject<string>();

  protected readonly fieldClasses = AUTH_FIELD_CLASSES;
  protected readonly labelClasses = AUTH_LABEL_CLASSES;
  protected readonly errorClasses = AUTH_ERROR_CLASSES;
  protected readonly linkClasses = AUTH_LINK_CLASSES;

  protected readonly user = this.auth.currentUser;
  protected readonly profileLoading = signal(true);
  protected readonly profileError = signal<string | null>(null);
  protected readonly profileSaving = signal(false);
  protected readonly profileFormError = signal<string | null>(null);

  protected readonly addressLoading = signal(true);
  protected readonly addressError = signal<string | null>(null);
  protected readonly savedAddress = signal<DeliveryAddressDto | null>(null);
  protected readonly editingAddress = signal(false);
  protected readonly addressSaving = signal(false);
  protected readonly addressFormError = signal<string | null>(null);

  protected readonly cityQuery = signal('');
  protected readonly cityMatches = signal<NpCity[]>([]);
  protected readonly citySearching = signal(false);
  protected readonly cityTouched = signal(false);
  protected readonly selectedCity = signal<NpCity | null>(null);
  protected readonly branches = signal<NpBranch[]>([]);
  protected readonly branchesLoading = signal(false);
  protected readonly selectedBranchId = signal('');

  protected readonly ordersLoading = signal(true);
  protected readonly ordersError = signal<string | null>(null);
  protected readonly orders = signal<OrderSummary[]>([]);

  protected readonly loggingOut = signal(false);

  protected readonly profileForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(50)]],
    lastName: ['', [Validators.required, Validators.maxLength(50)]],
    phone: [''],
  });

  protected readonly passwordExpanded = signal(false);
  protected readonly passwordSaving = signal(false);
  protected readonly passwordFormError = signal<string | null>(null);
  protected readonly newPasswordValue = signal('');

  protected readonly passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: [passwordsMatch, passwordsDiffer] },
  );

  protected readonly initials = computed(() => {
    const u = this.user();
    return u ? initialsOf(u.firstName, u.lastName) : '';
  });

  protected readonly memberYear = computed(() => {
    const u = this.user();
    return u ? memberSinceYear(u.createdAt) : '';
  });

  protected readonly passwordChangedLabel = computed(() => {
    const u = this.user();
    if (!u) {
      return '';
    }
    const iso = u.passwordChangedAt ?? u.createdAt;
    return this.locale.formatDate(iso);
  });
  protected readonly showCityList = computed(() => {
    return (
      this.editingAddress() &&
      this.cityTouched() &&
      !this.selectedCity() &&
      this.cityMatches().length > 0 &&
      this.cityQuery().trim().length >= 1
    );
  });

  protected readonly showCityEmpty = computed(() => {
    return (
      this.editingAddress() &&
      this.cityTouched() &&
      !this.selectedCity() &&
      this.cityQuery().trim().length >= 1 &&
      !this.citySearching() &&
      this.cityMatches().length === 0
    );
  });

  protected readonly canSaveAddress = computed(
    () => !!this.selectedCity() && !!this.selectedBranchId(),
  );

  protected readonly showSavedAddressCard = computed(
    () => !!this.savedAddress() && !this.editingAddress(),
  );

  protected readonly showAddressForm = computed(
    () => this.editingAddress() || (!this.savedAddress() && !this.addressLoading()),
  );

  constructor() {
    this.loadAll();

    this.cityQuery$
      .pipe(
        debounceTime(280),
        distinctUntilChanged(),
        switchMap((query) => {
          const q = query.trim();
          if (q.length < 1) {
            this.cityMatches.set([]);
            this.citySearching.set(false);
            return of(null);
          }
          this.citySearching.set(true);
          return this.shipping.searchCities(q).pipe(
            finalize(() => this.citySearching.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          if (!response) {
            return;
          }
          if (response.success && response.data) {
            this.cityMatches.set(response.data);
          } else {
            this.cityMatches.set([]);
          }
        },
        error: () => this.cityMatches.set([]),
      });
  }

  protected loadAll(): void {
    this.loadProfile();
    this.loadAddress();
    this.loadOrders();
  }

  protected loadProfile(): void {
    this.profileLoading.set(true);
    this.profileError.set(null);
    this.auth
      .me()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.profileLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          if (!response.success || !response.data) {
            this.profileError.set(response.error ?? this.i18n.translate('profile.loadProfileError'));
            return;
          }
          this.profileForm.patchValue({
            firstName: response.data.firstName,
            lastName: response.data.lastName,
            phone: response.data.phone ?? '',
          });
        },
        error: (err: unknown) => {
          this.profileError.set(extractApiError(err, this.i18n.translate('profile.loadProfileError')));
        },
      });
  }

  protected loadAddress(): void {
    this.addressLoading.set(true);
    this.addressError.set(null);
    this.auth
      .getDeliveryAddress()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.addressLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          if (!response.success) {
            this.addressError.set(response.error ?? this.i18n.translate('profile.loadAddressError'));
            return;
          }
          this.savedAddress.set(response.data ?? null);
          if (!response.data) {
            this.editingAddress.set(true);
          }
        },
        error: (err: unknown) => {
          this.addressError.set(extractApiError(err, this.i18n.translate('profile.loadAddressError')));
        },
      });
  }

  protected loadOrders(): void {
    this.ordersLoading.set(true);
    this.ordersError.set(null);
    this.ordersApi
      .getMyOrders(20)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.ordersLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          if (!response.success || !response.data) {
            this.ordersError.set(response.error ?? this.i18n.translate('profile.loadOrdersError'));
            return;
          }
          this.orders.set(response.data);
        },
        error: (err: unknown) => {
          this.ordersError.set(extractApiError(err, this.i18n.translate('profile.loadOrdersError')));
        },
      });
  }

  protected saveProfile(): void {
    this.profileFormError.set(null);
    this.profileForm.markAllAsTouched();
    const phone = this.profileForm.controls.phone.value.trim();
    if (phone && !isValidUaPhone(phone)) {
      this.profileForm.controls.phone.setErrors({ phone: true });
      return;
    }
    if (this.profileForm.invalid || this.profileSaving()) {
      return;
    }

    this.profileSaving.set(true);
    const value = this.profileForm.getRawValue();
    this.auth
      .updateProfile({
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
        phone: phone ? normalizePhone(phone) : null,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.profileSaving.set(false)),
      )
      .subscribe({
        next: (response) => {
          if (!response.success || !response.data) {
            this.profileFormError.set(response.error ?? this.i18n.translate('profile.saveChangesError'));
            return;
          }
          this.toasts.success(this.i18n.translate('profile.saveChangesSuccess'));
        },
        error: (err: unknown) => {
          this.profileFormError.set(extractApiError(err, this.i18n.translate('profile.saveChangesError')));
          this.toasts.error(this.i18n.translate('profile.saveChangesError'));
        },
      });
  }

  protected openPasswordForm(): void {
    this.passwordExpanded.set(true);
    this.passwordFormError.set(null);
  }

  protected cancelPasswordForm(): void {
    this.passwordExpanded.set(false);
    this.passwordFormError.set(null);
    this.clearPasswordForm();
  }

  protected onNewPasswordInput(): void {
    this.newPasswordValue.set(this.passwordForm.controls.newPassword.value);
  }

  protected changePassword(): void {
    this.passwordFormError.set(null);
    this.passwordForm.markAllAsTouched();
    if (this.passwordForm.invalid || this.passwordSaving()) {
      return;
    }

    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.passwordSaving.set(true);
    this.auth
      .changePassword({ currentPassword, newPassword })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.passwordSaving.set(false)),
      )
      .subscribe({
        next: (response) => {
          if (!response.success) {
            this.passwordFormError.set(response.error ?? this.i18n.translate('profile.updatePasswordError'));
            return;
          }
          this.toasts.success(this.i18n.translate('profile.updatePasswordSuccess'));
          this.cancelPasswordForm();
          this.auth
            .me()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({ error: () => undefined });
        },
        error: (err: unknown) => {
          this.passwordFormError.set(
            extractApiError(err, this.i18n.translate('profile.updatePasswordRetry')),
          );
        },
      });
  }

  protected startEditAddress(): void {
    const saved = this.savedAddress();
    this.editingAddress.set(true);
    this.addressFormError.set(null);
    this.cityTouched.set(false);
    this.cityMatches.set([]);
    if (saved) {
      this.cityQuery.set(saved.cityName);
      this.selectedCity.set({
        cityId: saved.cityId,
        cityName: saved.cityName,
        region: saved.cityRegion,
      });
      this.selectedBranchId.set(saved.branchId);
      this.loadBranches(saved.cityId, saved.branchId);
    } else {
      this.resetAddressForm();
    }
  }

  protected cancelAddressEdit(): void {
    if (this.savedAddress()) {
      this.editingAddress.set(false);
      this.addressFormError.set(null);
      this.resetAddressForm();
    }
  }

  protected onCityInput(value: string): void {
    this.cityQuery.set(value);
    this.cityTouched.set(true);
    this.selectedCity.set(null);
    this.selectedBranchId.set('');
    this.branches.set([]);
    this.cityQuery$.next(value);
  }

  protected pickCity(city: NpCity): void {
    this.selectedCity.set(city);
    this.cityQuery.set(city.cityName);
    this.cityTouched.set(false);
    this.cityMatches.set([]);
    this.selectedBranchId.set('');
    this.loadBranches(city.cityId);
  }

  protected onBranchChange(branchId: string): void {
    this.selectedBranchId.set(branchId);
  }

  protected saveAddress(): void {
    this.addressFormError.set(null);
    const city = this.selectedCity();
    const branchId = this.selectedBranchId();
    const branch = this.branches().find((b) => b.branchId === branchId);
    if (!city || !branch || this.addressSaving()) {
      return;
    }

    this.addressSaving.set(true);
    this.auth
      .saveDeliveryAddress({
        cityId: city.cityId,
        cityName: city.cityName,
        cityRegion: city.region ?? null,
        branchId: branch.branchId,
        branchLabel: branch.label,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.addressSaving.set(false)),
      )
      .subscribe({
        next: (response) => {
          if (!response.success || !response.data) {
            this.addressFormError.set(response.error ?? this.i18n.translate('profile.saveAddressError'));
            return;
          }
          this.savedAddress.set(response.data);
          this.editingAddress.set(false);
          this.toasts.success(this.i18n.translate('profile.saveAddressSuccess'));
        },
        error: (err: unknown) => {
          this.addressFormError.set(extractApiError(err, this.i18n.translate('profile.saveAddressError')));
          this.toasts.error(this.i18n.translate('profile.saveAddressError'));
        },
      });
  }

  protected logout(): void {
    if (this.loggingOut()) {
      return;
    }
    this.loggingOut.set(true);
    this.auth
      .logout()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loggingOut.set(false)),
      )
      .subscribe({
        next: () => {
          this.toasts.success(this.i18n.translate('profile.logoutSuccess'));
          void this.router.navigate(this.locale.commands('catalog'));
        },
        error: () => {
          this.auth.clearSession();
          this.toasts.success(this.i18n.translate('profile.logoutSuccess'));
          void this.router.navigate(this.locale.commands('catalog'));
        },
      });
  }

  protected orderMeta(order: OrderSummary): string {
    const form = this.locale.pluralForm(order.itemCount);
    const countLabel = this.i18n.translate(`plural.products.${form}`, { count: order.itemCount });
    return `${this.locale.formatDate(order.createdAt)} · ${countLabel}`;
  }

  protected orderTotal(order: OrderSummary): string {
    return this.locale.formatPrice(order.totalAmount);
  }

  protected statusLabel(order: OrderSummary): string {
    return orderStatusLabel(order.status, (key) => this.i18n.translate(key));
  }

  protected statusTone(order: OrderSummary): string {
    return orderStatusTone(order.status);
  }

  protected phoneInvalid(): boolean {
    const c = this.profileForm.controls.phone;
    return c.hasError('phone') && (c.dirty || c.touched);
  }

  private loadBranches(cityId: string, preferBranchId?: string): void {
    this.branchesLoading.set(true);
    this.shipping
      .getBranches(cityId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.branchesLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.branches.set(response.data);
            if (preferBranchId && response.data.some((b) => b.branchId === preferBranchId)) {
              this.selectedBranchId.set(preferBranchId);
            }
          } else {
            this.branches.set([]);
          }
        },
        error: () => this.branches.set([]),
      });
  }

  private resetAddressForm(): void {
    this.cityQuery.set('');
    this.selectedCity.set(null);
    this.selectedBranchId.set('');
    this.branches.set([]);
    this.cityMatches.set([]);
    this.cityTouched.set(false);
  }

  private clearPasswordForm(): void {
    this.passwordForm.reset({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    this.newPasswordValue.set('');
  }
}
