import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { IconComponent } from '../../components/icon/icon.component';
import { productStrengthColor } from '../../components/product-strength/product-strength.component';
import {
  AdminProduct,
  SaveProductRequest,
  SaveProductVariantRequest,
  VARIANT_PRESETS,
} from '../../models/admin.models';
import { AdminService } from '../../services/admin.service';
import { extractApiError } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { sanitizeImageUrl } from '../../utils/sanitize-image-url';

type VariantRow = {
  weight: number;
  weightUnit: string;
  sortOrder: number;
  label: string;
  price: string;
  isActive: boolean;
};

function emptyVariantRows(): VariantRow[] {
  return VARIANT_PRESETS.map((preset) => ({
    weight: preset.weight,
    weightUnit: preset.weightUnit,
    sortOrder: preset.sortOrder,
    label: preset.label,
    price: '',
    isActive: true,
  }));
}

function mergeVariantsOntoPresets(
  variants: AdminProduct['variants'] | undefined,
): VariantRow[] {
  const rows = emptyVariantRows();
  for (const variant of variants ?? []) {
    const index = rows.findIndex(
      (row) =>
        row.weight === Number(variant.weight) &&
        row.weightUnit === variant.weightUnit,
    );
    if (index < 0) continue;
    rows[index] = {
      ...rows[index],
      price: variant.price != null ? String(variant.price) : '',
      isActive: variant.isActive !== false,
    };
  }
  return rows;
}

function toStrength(value: number | string | null | undefined): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : null;
}

@Component({
  selector: 'app-admin-product-form',
  imports: [ReactiveFormsModule, TranslocoPipe, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-product-form.component.html',
  styleUrl: './admin-product-form.component.css',
})
export class AdminProductFormComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly admin = inject(AdminService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);

  readonly id = Number(this.route.snapshot.paramMap.get('id')) || null;
  readonly categories = signal<{ id: number; name: string; children: { id: number; name: string }[] }[]>([]);
  readonly loading = signal(!!this.id);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly imageUrls = signal<string[]>([]);
  readonly nameTab = signal<'ua' | 'en'>('ua');
  readonly shortTab = signal<'ua' | 'en'>('ua');
  readonly descTab = signal<'ua' | 'en'>('ua');
  readonly variantRows = signal<VariantRow[]>(emptyVariantRows());
  readonly variantError = signal<string | null>(null);
  protected readonly strengthLevels = [1, 2, 3, 4, 5] as const;

  protected flameColor(level: number): string {
    const strength = this.form.controls.strength.value ?? 0;
    if (level > strength) return 'var(--kraft-300)';
    return productStrengthColor(strength);
  }
  private readonly failedImageUrls = signal(new Set<string>());
  private dragFrom: number | null = null;

  readonly form = this.fb.group({
    nameUk: ['', Validators.required],
    nameEn: [''],
    categoryId: [0, Validators.min(1)],
    shortDescriptionUk: [''],
    shortDescriptionEn: [''],
    descriptionUk: [''],
    descriptionEn: [''],
    isActive: [true],
    isFeatured: [false],
    isAvailable: [true],
    strength: this.fb.control<number | null>(null),
  });
  readonly slug = () =>
    this.form.controls.nameUk.value
      .toLowerCase()
      .trim()
      .replace(/['’']/g, '')
      .replace(/[^a-zа-яіїєґ0-9]+/gi, '-')
      .replace(/^-|-$/g, '');

  constructor() {
    this.admin
      .getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        if (response.success) this.categories.set(response.data);
      });
    if (this.id) this.load();
  }

  invalid(name: 'nameUk' | 'categoryId'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.saving());
  }

  hasPrice(row: VariantRow): boolean {
    const price = Number(row.price);
    return row.price.trim() !== '' && Number.isFinite(price) && price > 0;
  }

  onPriceInput(index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.variantRows.update((rows) =>
      rows.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, price: value };
        if (!this.hasPrice(next)) {
          next.isActive = true;
        }
        return next;
      }),
    );
    this.variantError.set(null);
  }

  onActiveToggle(index: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.variantRows.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, isActive: checked } : row)),
    );
    this.variantError.set(null);
  }

  previewUrl(url: string): string | null {
    if (this.failedImageUrls().has(url)) return null;
    return sanitizeImageUrl(url);
  }

  markImageFailed(url: string): void {
    this.failedImageUrls.update((urls) => {
      const next = new Set(urls);
      next.add(url);
      return next;
    });
  }

  load(): void {
    this.admin
      .getProduct(this.id!)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success) this.patch(response.data);
          else this.toast.error(response.error ?? this.i18n.translate('admin.loadProductError'));
          this.loading.set(false);
        },
        error: (error) => {
          this.toast.error(extractApiError(error, this.i18n.translate('admin.loadProductError')));
          this.loading.set(false);
        },
      });
  }

  patch(product: AdminProduct): void {
    this.form.patchValue({
      nameUk: product.nameUk ?? product.name ?? '',
      nameEn: product.nameEn ?? '',
      categoryId: product.categoryId,
      shortDescriptionUk: product.shortDescriptionUk ?? product.shortDescription ?? '',
      shortDescriptionEn: product.shortDescriptionEn ?? '',
      descriptionUk: product.descriptionUk ?? product.description ?? '',
      descriptionEn: product.descriptionEn ?? '',
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      isAvailable: product.isAvailable,
      strength: toStrength(product.strength),
    });
    this.variantRows.set(mergeVariantsOntoPresets(product.variants));
    const urls = product.imageUrls?.length
      ? [...product.imageUrls]
      : product.imageUrl
        ? [product.imageUrl]
        : [];
    this.imageUrls.set(urls);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) this.upload(file);
  }

  onFilePick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.upload(file);
  }

  onDragStart(index: number): void {
    this.dragFrom = index;
  }

  onReorderDrop(event: DragEvent, toIndex: number): void {
    event.preventDefault();
    const from = this.dragFrom;
    this.dragFrom = null;
    if (from === null || from === toIndex) return;
    this.imageUrls.update((urls) => {
      const next = [...urls];
      const [moved] = next.splice(from, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  removeImage(index: number): void {
    this.imageUrls.update((urls) => urls.filter((_, i) => i !== index));
  }

  private upload(file: File): void {
    if (this.uploading()) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      this.toast.error(this.i18n.translate('admin.imageTypeError'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.toast.error(this.i18n.translate('admin.imageSizeError'));
      return;
    }

    this.uploading.set(true);
    this.admin
      .uploadImage(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.uploading.set(false);
          if (response.success) {
            this.imageUrls.update((urls) => [...urls, response.data.url]);
            this.failedImageUrls.update((failed) => {
              const next = new Set(failed);
              next.delete(response.data.url);
              return next;
            });
          } else {
            this.toast.error(response.error ?? this.i18n.translate('admin.uploadImageError'));
          }
        },
        error: (error) => {
          this.uploading.set(false);
          this.toast.error(extractApiError(error, this.i18n.translate('admin.uploadImageError')));
        },
      });
  }

  private buildVariantsPayload(): SaveProductVariantRequest[] | null {
    const payload: SaveProductVariantRequest[] = [];
    for (const row of this.variantRows()) {
      const priceRaw = row.price.trim();
      if (!priceRaw) continue;
      const price = Number(priceRaw);
      if (!Number.isFinite(price) || price <= 0) {
        this.variantError.set(this.i18n.translate('admin.reqPrice'));
        return null;
      }
      payload.push({
        weight: row.weight,
        weightUnit: row.weightUnit,
        price,
        isActive: row.isActive,
        sortOrder: row.sortOrder,
      });
    }
    return payload;
  }

  save(): void {
    this.form.markAllAsTouched();
    this.variantError.set(null);
    if (this.form.invalid || this.saving() || this.uploading()) return;

    const variants = this.buildVariantsPayload();
    if (!variants) return;

    const value = this.form.getRawValue();
    if (value.isActive) {
      const hasActivePriced = variants.some((v) => v.isActive);
      if (!hasActivePriced) {
        this.variantError.set(this.i18n.translate('admin.reqActiveVariant'));
        return;
      }
    }

    this.saving.set(true);
    const imageUrls = this.imageUrls();
    const payload: SaveProductRequest = {
      nameUk: value.nameUk,
      nameEn: value.nameEn.trim() || null,
      slug: this.slug(),
      categoryId: value.categoryId,
      shortDescriptionUk: value.shortDescriptionUk.trim() || null,
      shortDescriptionEn: value.shortDescriptionEn.trim() || null,
      descriptionUk: value.descriptionUk.trim() || null,
      descriptionEn: value.descriptionEn.trim() || null,
      variants,
      imageUrl: imageUrls[0] ?? null,
      imageUrls,
      isActive: value.isActive,
      isFeatured: value.isFeatured,
      isAvailable: value.isAvailable,
      strength: toStrength(value.strength),
    };
    const request = this.id ? this.admin.updateProduct(this.id, payload) : this.admin.createProduct(payload);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.saving.set(false);
        if (response.success) {
          this.toast.success(this.i18n.translate('admin.productSaved'));
          this.back();
        } else this.toast.error(response.error ?? this.i18n.translate('admin.saveProductError'));
      },
      error: (error) => {
        this.saving.set(false);
        this.toast.error(extractApiError(error, this.i18n.translate('admin.saveProductError')));
      },
    });
  }

  back(): void {
    this.router.navigateByUrl('/admin/products');
  }
}
