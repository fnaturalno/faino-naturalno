import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

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

@Component({
  selector: 'app-admin-product-form',
  imports: [ReactiveFormsModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="mb-5 rounded border border-[#c2ab80] bg-white px-3 py-2 text-sm" (click)="back()">
      {{ id ? ('admin.formBackEdit' | transloco) : ('admin.formBackNew' | transloco) }}
    </button>
    @if (loading()) {
      <div class="h-96 animate-pulse rounded-xl bg-[#f5ecd8]"></div>
    } @else {
      <form [formGroup]="form" (ngSubmit)="save()" class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div class="space-y-5">
          <section class="rounded-xl border border-[#dac7a2] bg-white p-5">
            <h2 class="mb-4 font-black">{{ 'admin.sectionBasic' | transloco }}</h2>

            <div class="mb-3 flex gap-1 rounded-lg bg-[#f5ecd8] p-1">
              <button type="button" class="flex-1 rounded-md px-3 py-1.5 text-sm font-bold" [class.bg-white]="nameTab() === 'ua'" [class.shadow-sm]="nameTab() === 'ua'" (click)="nameTab.set('ua')">{{ 'admin.tabUa' | transloco }}</button>
              <button type="button" class="flex-1 rounded-md px-3 py-1.5 text-sm font-bold" [class.bg-white]="nameTab() === 'en'" [class.shadow-sm]="nameTab() === 'en'" (click)="nameTab.set('en')">{{ 'admin.tabEn' | transloco }}</button>
            </div>
            @if (nameTab() === 'ua') {
              <label class="block text-sm font-bold">{{ 'admin.nameUk' | transloco }}
                <input formControlName="nameUk" class="mt-1 w-full rounded-lg border border-[#c2ab80] p-3 font-normal" />
              </label>
              @if (invalid('nameUk')) {
                <p class="mt-1 text-xs text-[#b23a2e]">{{ 'admin.reqProductName' | transloco }}</p>
              }
            } @else {
              <label class="block text-sm font-bold">{{ 'admin.nameEn' | transloco }}
                <input formControlName="nameEn" class="mt-1 w-full rounded-lg border border-[#c2ab80] p-3 font-normal" />
              </label>
            }

            <p class="mt-4 rounded bg-[#f5ecd8] p-3 text-sm text-[#6a4425]">
              {{ 'admin.slugHint' | transloco }} <strong>/catalog/{{ slug() }}</strong>
            </p>
            <label class="mt-4 block text-sm font-bold">{{ 'admin.category' | transloco }}
              <select formControlName="categoryId" class="mt-1 w-full rounded-lg border border-[#c2ab80] bg-white p-3 font-normal">
                <option [ngValue]="0">{{ 'admin.pickCategory' | transloco }}</option>
                @for (category of categories(); track category.id) {
                  <optgroup [label]="category.name">
                    <option [ngValue]="category.id">{{ category.name }}</option>
                    @for (child of category.children; track child.id) {
                      <option [ngValue]="child.id">↳ {{ child.name }}</option>
                    }
                  </optgroup>
                }
              </select>
            </label>
            @if (invalid('categoryId')) {
              <p class="mt-1 text-xs text-[#b23a2e]">{{ 'admin.reqCategory' | transloco }}</p>
            }
          </section>

          <section class="rounded-xl border border-[#dac7a2] bg-white p-5">
            <h2 class="mb-4 font-black">{{ 'admin.sectionDescription' | transloco }}</h2>

            <div class="mb-3 flex gap-1 rounded-lg bg-[#f5ecd8] p-1">
              <button type="button" class="flex-1 rounded-md px-3 py-1.5 text-sm font-bold" [class.bg-white]="shortTab() === 'ua'" [class.shadow-sm]="shortTab() === 'ua'" (click)="shortTab.set('ua')">{{ 'admin.tabUa' | transloco }}</button>
              <button type="button" class="flex-1 rounded-md px-3 py-1.5 text-sm font-bold" [class.bg-white]="shortTab() === 'en'" [class.shadow-sm]="shortTab() === 'en'" (click)="shortTab.set('en')">{{ 'admin.tabEn' | transloco }}</button>
            </div>
            @if (shortTab() === 'ua') {
              <label class="block text-sm font-bold">{{ 'admin.shortUk' | transloco }}
                <input formControlName="shortDescriptionUk" class="mt-1 w-full rounded-lg border border-[#c2ab80] p-3 font-normal" />
              </label>
            } @else {
              <label class="block text-sm font-bold">{{ 'admin.shortEn' | transloco }}
                <input formControlName="shortDescriptionEn" class="mt-1 w-full rounded-lg border border-[#c2ab80] p-3 font-normal" />
              </label>
            }

            <div class="mb-3 mt-4 flex gap-1 rounded-lg bg-[#f5ecd8] p-1">
              <button type="button" class="flex-1 rounded-md px-3 py-1.5 text-sm font-bold" [class.bg-white]="descTab() === 'ua'" [class.shadow-sm]="descTab() === 'ua'" (click)="descTab.set('ua')">{{ 'admin.tabUa' | transloco }}</button>
              <button type="button" class="flex-1 rounded-md px-3 py-1.5 text-sm font-bold" [class.bg-white]="descTab() === 'en'" [class.shadow-sm]="descTab() === 'en'" (click)="descTab.set('en')">{{ 'admin.tabEn' | transloco }}</button>
            </div>
            @if (descTab() === 'ua') {
              <label class="block text-sm font-bold">{{ 'admin.descUk' | transloco }}
                <textarea formControlName="descriptionUk" class="mt-1 min-h-32 w-full rounded-lg border border-[#c2ab80] p-3 font-normal"></textarea>
              </label>
            } @else {
              <label class="block text-sm font-bold">{{ 'admin.descEn' | transloco }}
                <textarea formControlName="descriptionEn" class="mt-1 min-h-32 w-full rounded-lg border border-[#c2ab80] p-3 font-normal"></textarea>
              </label>
            }
          </section>

          <section class="rounded-xl border border-[#dac7a2] bg-white p-5">
            <h2 class="mb-4 font-black">{{ 'admin.sectionPrice' | transloco }}</h2>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[400px] border-collapse text-left text-sm">
                <thead>
                  <tr class="border-b border-[#eadcc0] text-[#6a4425]">
                    <th class="py-2 pr-2 font-bold">{{ 'admin.weightUnit' | transloco }}</th>
                    <th class="py-2 pr-2 font-bold">{{ 'admin.price' | transloco }}</th>
                    <th class="py-2 font-bold">{{ 'admin.variantActive' | transloco }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of variantRows(); track row.sortOrder; let i = $index) {
                    <tr class="border-b border-[#f0e6d4]">
                      <td class="py-2.5 pr-2 font-semibold text-[#2a1a0d]">{{ row.label }}</td>
                      <td class="py-2.5 pr-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          class="w-full min-w-[96px] rounded-lg border border-[#c2ab80] p-2 font-normal"
                          [value]="row.price"
                          (input)="onPriceInput(i, $event)"
                        />
                      </td>
                      <td class="py-2.5">
                        <input
                          type="checkbox"
                          class="h-5 w-5 accent-[#5b7a3a]"
                          [checked]="row.isActive"
                          [disabled]="!hasPrice(row)"
                          (change)="onActiveToggle(i, $event)"
                        />
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            @if (variantError(); as err) {
              <p class="mt-2 text-xs text-[#b23a2e]">{{ err }}</p>
            }
          </section>
        </div>

        <div class="space-y-5">
          <section class="rounded-xl border border-[#dac7a2] bg-white p-5">
            <h2 class="mb-4 font-black">{{ 'admin.sectionImages' | transloco }}</h2>
            <label
              class="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-[#c2ab80] bg-[#f5ecd8] px-4 py-7 text-center transition hover:border-[#e4a600]"
              [class.opacity-60]="uploading()"
              (dragover)="$event.preventDefault()"
              (drop)="onDrop($event)"
            >
              <input type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" class="sr-only" [disabled]="uploading()" (change)="onFilePick($event)" />
              <span class="text-sm font-bold text-[#4e301a]">{{ uploading() ? ('admin.uploading' | transloco) : ('admin.dropPhotos' | transloco) }}</span>
              <span class="text-xs text-[#9c8461]">{{ 'admin.dropHint' | transloco }}</span>
            </label>

            @if (imageUrls().length) {
              <div class="mt-4 grid grid-cols-3 gap-2.5">
                @for (url of imageUrls(); track url; let index = $index) {
                  <div
                    class="relative aspect-square overflow-hidden rounded border-2 bg-[#f5ecd8]"
                    [class.border-[#e4a600]]="index === 0"
                    [class.border-[#eadcc0]]="index !== 0"
                    draggable="true"
                    (dragstart)="onDragStart(index)"
                    (dragover)="$event.preventDefault()"
                    (drop)="onReorderDrop($event, index)"
                  >
                    @if (previewUrl(url); as src) {
                      <img [src]="src" [alt]="'admin.photoAlt' | transloco: { n: index + 1 }" class="h-full w-full object-cover" (error)="markImageFailed(url)" />
                    } @else {
                      <span class="grid h-full place-items-center text-xs text-[#9c8461]">{{ 'admin.photoFallback' | transloco }}</span>
                    }
                    @if (index === 0) {
                      <span class="absolute left-1 top-1 rounded-full bg-[#f5b800] px-1.5 text-[9px] font-extrabold text-[#2a1a0d]">{{ 'admin.mainPhoto' | transloco }}</span>
                    }
                    <button type="button" class="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-[#2a1a0d]/70 text-xs text-white" [attr.aria-label]="'admin.removePhoto' | transloco: { n: index + 1 }" (click)="removeImage(index)">×</button>
                  </div>
                }
              </div>
              <p class="mt-2 text-xs text-[#9c8461]">{{ 'admin.reorderHint' | transloco }}</p>
            }
          </section>

          <section class="rounded-xl border border-[#dac7a2] bg-white p-5">
            <h2 class="mb-4 font-black">{{ 'admin.sectionSettings' | transloco }}</h2>
            <label class="flex items-center justify-between font-bold">{{ 'admin.isActive' | transloco }} <input formControlName="isActive" type="checkbox" class="h-5 w-5 accent-[#5b7a3a]" /></label>
            <p class="mb-4 text-xs text-[#9c8461]">{{ 'admin.isActiveHint' | transloco }}</p>
            <label class="flex items-center justify-between font-bold">{{ 'admin.isFeatured' | transloco }} <input formControlName="isFeatured" type="checkbox" class="h-5 w-5 accent-[#5b7a3a]" /></label>
            <p class="mb-4 text-xs text-[#9c8461]">{{ 'admin.isFeaturedHint' | transloco }}</p>
            <label class="flex items-center justify-between font-bold">{{ 'admin.isAvailable' | transloco }} <input formControlName="isAvailable" type="checkbox" class="h-5 w-5 accent-[#5b7a3a]" /></label>
            <p class="text-xs text-[#9c8461]">{{ 'admin.isAvailableHint' | transloco }}</p>
          </section>

          <div class="flex gap-3">
            <button type="submit" class="flex-1 rounded-lg bg-[#f5b800] px-4 py-3 font-bold disabled:opacity-50" [disabled]="saving() || uploading()">
              {{ saving() ? ('common.saving' | transloco) : ('common.save' | transloco) }}
            </button>
            <button type="button" class="rounded-lg border border-[#c2ab80] px-4 py-3 font-bold" (click)="back()">{{ 'common.cancel' | transloco }}</button>
          </div>
        </div>
      </form>
    }
  `,
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
