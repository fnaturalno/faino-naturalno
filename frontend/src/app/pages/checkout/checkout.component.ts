import { DecimalPipe, Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  finalize,
  forkJoin,
  of,
  switchMap,
} from 'rxjs';

import { IconComponent } from '../../components/icon/icon.component';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { DeliveryAddressDto, NpBranch, NpCity } from '../../models/auth.models';
import { cartItemCountLabel } from '../../models/cart.models';
import { PlaceOrderRequest } from '../../models/order.models';
import { AuthService, extractApiError } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';
import { ShippingService } from '../../services/shipping.service';
import { ToastService } from '../../services/toast.service';
import { sanitizeImageUrl } from '../../utils/sanitize-image-url';
import {
  AUTH_ERROR_CLASSES,
  AUTH_FIELD_CLASSES,
  AUTH_LABEL_CLASSES,
  AUTH_LINK_CLASSES,
  isRequiredUaPhone,
  normalizePhone,
} from '../auth/auth.helpers';

@Component({
  selector: 'app-checkout',
  imports: [
    DecimalPipe,
    IconComponent,
    NavbarComponent,
    ReactiveFormsModule,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './checkout.component.html',
  styles: `
    @keyframes fnCheckoutPulse {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.45;
      }
    }
    .fn-co-sk {
      background: var(--kraft-200);
      animation: fnCheckoutPulse 1.3s ease-in-out infinite;
    }
    @keyframes fnSpin {
      to {
        transform: rotate(360deg);
      }
    }
    .fn-co-spin {
      width: 18px;
      height: 18px;
      border: 2.5px solid var(--kraft-300);
      border-top-color: var(--cinnamon-700);
      border-radius: 999px;
      animation: fnSpin 0.7s linear infinite;
    }
  `,
})
export class CheckoutComponent {
  private readonly fb = inject(FormBuilder);
  private readonly cart = inject(CartService);
  private readonly auth = inject(AuthService);
  private readonly orders = inject(OrderService);
  private readonly shipping = inject(ShippingService);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cityQuery$ = new Subject<string>();

  private readonly cityInput =
    viewChild<ElementRef<HTMLInputElement>>('cityInput');

  protected readonly fieldClasses = AUTH_FIELD_CLASSES;
  protected readonly labelClasses = AUTH_LABEL_CLASSES;
  protected readonly errorClasses = AUTH_ERROR_CLASSES;
  protected readonly linkClasses = AUTH_LINK_CLASSES;

  protected readonly items = this.cart.items;
  protected readonly subtotal = this.cart.subtotal;
  protected readonly loadStatus = this.cart.loadStatus;
  protected readonly loadError = this.cart.loadError;

  protected readonly prefillReady = signal(false);
  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);

  protected readonly savedAddress = signal<DeliveryAddressDto | null>(null);
  protected readonly editingDelivery = signal(false);
  protected readonly cityError = signal<string | null>(null);
  protected readonly branchError = signal<string | null>(null);

  protected readonly cityQuery = signal('');
  protected readonly cityMatches = signal<NpCity[]>([]);
  protected readonly citySearching = signal(false);
  protected readonly cityTouched = signal(false);
  protected readonly selectedCity = signal<NpCity | null>(null);
  protected readonly branches = signal<NpBranch[]>([]);
  protected readonly branchesLoading = signal(false);
  protected readonly selectedBranchId = signal('');

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(50)]],
    lastName: ['', [Validators.required, Validators.maxLength(50)]],
    phone: [
      '',
      [
        Validators.required,
        Validators.maxLength(20),
        (control) =>
          !control.value || isRequiredUaPhone(String(control.value))
            ? null
            : { phone: true },
      ],
    ],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
    comment: ['', [Validators.maxLength(1000)]],
  });

  protected readonly showCityList = computed(() => {
    return (
      this.showDeliveryEditors() &&
      this.cityTouched() &&
      !this.selectedCity() &&
      this.cityMatches().length > 0 &&
      this.cityQuery().trim().length >= 1
    );
  });

  protected readonly showCityEmpty = computed(() => {
    return (
      this.showDeliveryEditors() &&
      this.cityTouched() &&
      !this.selectedCity() &&
      this.cityQuery().trim().length >= 1 &&
      !this.citySearching() &&
      this.cityMatches().length === 0
    );
  });

  protected readonly showSavedBanner = computed(
    () => !!this.savedAddress() && !this.editingDelivery(),
  );

  protected readonly showDeliveryEditors = computed(
    () => !this.savedAddress() || this.editingDelivery(),
  );

  protected readonly formLocked = computed(() => this.submitting());

  protected readonly submitBlocked = computed(
    () =>
      this.loadStatus() !== 'ready' ||
      !this.cart.hasItems() ||
      !this.prefillReady() ||
      this.submitting(),
  );

  protected readonly countLabel = computed(() => cartItemCountLabel(this.cart.itemCount()));

  protected readonly skeletonSlots = [0, 1, 2];

  constructor() {
    this.cart.closeDrawer();
    this.bootstrap();

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
          if (!response) return;
          if (response.success && response.data) {
            this.cityMatches.set(response.data);
          } else {
            this.cityMatches.set([]);
            if (!response.success) {
              this.toasts.error(response.error ?? 'Не вдалося знайти місто');
            }
          }
        },
        error: () => {
          this.cityMatches.set([]);
          this.toasts.error('Не вдалося знайти місто');
        },
      });
  }

  protected retryCart(): void {
    this.cart
      .loadCart()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success && response.data && (response.data.items?.length ?? 0) === 0) {
            void this.router.navigateByUrl('/cart');
          }
        },
      });
  }

  protected goBack(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      this.location.back();
      return;
    }
    void this.router.navigateByUrl('/cart');
  }

  protected lineImage(url: string | null | undefined): string | null {
    return sanitizeImageUrl(url);
  }

  protected onCityInput(value: string): void {
    this.cityError.set(null);
    this.cityQuery.set(value);
    this.cityTouched.set(true);
    this.selectedCity.set(null);
    this.selectedBranchId.set('');
    this.branches.set([]);
    this.branchError.set(null);
    this.cityQuery$.next(value);
  }

  protected pickCity(city: NpCity): void {
    this.cityError.set(null);
    this.branchError.set(null);
    this.selectedCity.set(city);
    this.cityQuery.set(city.cityName);
    this.cityTouched.set(false);
    this.cityMatches.set([]);
    this.selectedBranchId.set('');
    this.loadBranches(city.cityId);
  }

  protected onBranchChange(branchId: string): void {
    this.branchError.set(null);
    this.selectedBranchId.set(branchId);
  }

  protected changeSavedAddress(): void {
    this.editingDelivery.set(true);
    const saved = this.savedAddress();
    if (saved) {
      this.cityQuery.set(saved.cityName);
      this.selectedCity.set({
        cityId: saved.cityId,
        cityName: saved.cityName,
        region: saved.cityRegion,
      });
      this.selectedBranchId.set(saved.branchId);
      this.loadBranches(saved.cityId, saved.branchId);
    }
    queueMicrotask(() => this.cityInput()?.nativeElement.focus());
  }

  protected fieldInvalid(name: 'firstName' | 'lastName' | 'phone' | 'email' | 'comment'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted());
  }

  protected fieldError(name: 'firstName' | 'lastName' | 'phone' | 'email' | 'comment'): string {
    const control = this.form.controls[name];
    if (control.hasError('required')) {
      switch (name) {
        case 'firstName':
          return 'Вкажіть імʼя';
        case 'lastName':
          return 'Вкажіть прізвище';
        case 'phone':
          return 'Вкажіть телефон';
        case 'email':
          return 'Вкажіть ел. пошту';
        default:
          return 'Обовʼязкове поле';
      }
    }
    if (control.hasError('email')) {
      return 'Некоректна адреса ел. пошти';
    }
    if (control.hasError('phone')) {
      return 'Телефон у форматі +380XXXXXXXXX';
    }
    if (control.hasError('maxlength')) {
      return name === 'comment' ? 'Коментар занадто довгий (макс. 1000 символів)' : 'Занадто довге значення';
    }
    return 'Перевірте поле';
  }

  protected placeOrder(): void {
    if (this.submitBlocked()) return;

    this.submitted.set(true);
    this.cityError.set(null);
    this.branchError.set(null);

    this.form.markAllAsTouched();

    const city = this.selectedCity();
    const branchId = this.selectedBranchId();
    let branch = this.branches().find((b) => b.branchId === branchId);
    const saved = this.savedAddress();
    if (!branch && saved && !this.editingDelivery() && saved.branchId === branchId) {
      branch = { branchId: saved.branchId, label: saved.branchLabel };
    }

    if (!city) {
      this.cityError.set('Оберіть місто зі списку');
      this.editingDelivery.set(true);
    }
    if (!branch) {
      this.branchError.set('Оберіть відділення');
      this.editingDelivery.set(true);
    }

    if (this.form.invalid || !city || !branch) {
      return;
    }

    const value = this.form.getRawValue();
    const phoneRaw = value.phone.trim();
    const deliveryAddress =
      saved && !this.editingDelivery()
        ? saved.summary
        : `${city.cityName}, ${branch.label}`;

    const payload: PlaceOrderRequest = {
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      phone: normalizePhone(phoneRaw),
      email: value.email.trim(),
      cityId: city.cityId,
      cityName: city.cityName,
      cityRegion: city.region ?? null,
      branchId: branch.branchId,
      branchLabel: branch.label,
      deliveryAddress,
      comment: value.comment.trim() || null,
    };

    this.submitting.set(true);
    this.form.disable({ emitEvent: false });

    this.orders
      .placeOrder(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.submitting.set(false);
          this.form.enable({ emitEvent: false });
        }),
      )
      .subscribe({
        next: (response) => {
          if (!response.success || !response.data) {
            this.toasts.error(response.error ?? 'Не вдалося оформити замовлення');
            return;
          }
          this.cart.resetLocalState();
          void this.router.navigate(['/order', response.data.id], {
            queryParams: { token: response.data.confirmationToken },
          });
        },
        error: (err: unknown) => {
          this.toasts.error(extractApiError(err, 'Не вдалося оформити замовлення'));
        },
      });
  }

  private bootstrap(): void {
    this.cart
      .loadCart()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success && response.data && (response.data.items?.length ?? 0) === 0) {
            void this.router.navigateByUrl('/cart');
            return;
          }
        },
      });

    if (!this.auth.isAuthenticated()) {
      this.prefillReady.set(true);
      this.editingDelivery.set(true);
      return;
    }

    forkJoin({
      me: this.auth.me(),
      address: this.auth.getDeliveryAddress(),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.prefillReady.set(true)),
      )
      .subscribe({
        next: ({ me, address }) => {
          if (me.success && me.data) {
            this.form.patchValue({
              firstName: me.data.firstName ?? '',
              lastName: me.data.lastName ?? '',
              phone: me.data.phone ?? '',
              email: me.data.email ?? '',
            });
          }
          if (address.success && address.data) {
            this.applySavedAddress(address.data);
          } else {
            this.editingDelivery.set(true);
          }
        },
        error: () => {
          this.editingDelivery.set(true);
        },
      });
  }

  private applySavedAddress(saved: DeliveryAddressDto): void {
    this.savedAddress.set(saved);
    this.editingDelivery.set(false);
    this.cityQuery.set(saved.cityName);
    this.selectedCity.set({
      cityId: saved.cityId,
      cityName: saved.cityName,
      region: saved.cityRegion,
    });
    this.selectedBranchId.set(saved.branchId);
    this.loadBranches(saved.cityId, saved.branchId);
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
            this.toasts.error(response.error ?? 'Не вдалося завантажити відділення');
          }
        },
        error: () => {
          this.branches.set([]);
          this.toasts.error('Не вдалося завантажити відділення');
        },
      });
  }
}
