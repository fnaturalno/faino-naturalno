import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AdminProduct, SaveProductRequest } from '../../models/admin.models';
import { AdminService } from '../../services/admin.service';
import { extractApiError } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { sanitizeImageUrl } from '../../utils/sanitize-image-url';

type PackOption = { key: string; label: string; weight: number; unit: string };

const PACK_OPTIONS: readonly PackOption[] = [
  { key: '10g', label: '10 г', weight: 10, unit: 'г' },
  { key: '50g', label: '50 г', weight: 50, unit: 'г' },
  { key: '100g', label: '100 г', weight: 100, unit: 'г' },
  { key: '250g', label: '250 г', weight: 250, unit: 'г' },
  { key: '500g', label: '500 г', weight: 500, unit: 'г' },
  { key: '1kg', label: '1 кг', weight: 1, unit: 'кг' },
  { key: 'pcs', label: 'шт', weight: 1, unit: 'шт' },
] as const;

function packKeyFrom(weight: number | null | undefined, unit: string | null | undefined): string {
  const normalizedUnit = (unit ?? '').trim().toLowerCase();
  const match = PACK_OPTIONS.find(
    (pack) =>
      pack.unit.toLowerCase() === normalizedUnit &&
      Number(pack.weight) === Number(weight ?? 0),
  );
  return match?.key ?? `custom:${weight ?? ''}:${unit ?? ''}`;
}

function resolvePackKey(weight: number | null | undefined, unit: string | null | undefined): string {
  return packKeyFrom(weight, unit);
}

@Component({
  selector: 'app-admin-product-form',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="mb-5 rounded border border-[#c2ab80] bg-white px-3 py-2 text-sm" (click)="back()">
      ← Товари / {{ id ? 'Редагувати товар' : 'Новий товар' }}
    </button>
    @if (loading()) {
      <div class="h-96 animate-pulse rounded-xl bg-[#f5ecd8]"></div>
    } @else {
      <form [formGroup]="form" (ngSubmit)="save()" class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div class="space-y-5">
          <section class="rounded-xl border border-[#dac7a2] bg-white p-5">
            <h2 class="mb-4 font-black">Основне</h2>
            <label class="block text-sm font-bold"
              >Назва товару<input formControlName="name" class="mt-1 w-full rounded-lg border border-[#c2ab80] p-3 font-normal"
            /></label>
            @if (invalid('name')) {
              <p class="mt-1 text-xs text-[#b23a2e]">Вкажіть назву товару.</p>
            }
            <p class="mt-4 rounded bg-[#f5ecd8] p-3 text-sm text-[#6a4425]">
              URL (slug) — генерується автоматично: <strong>/catalog/{{ slug() }}</strong>
            </p>
            <label class="mt-4 block text-sm font-bold"
              >Категорія
              <select formControlName="categoryId" class="mt-1 w-full rounded-lg border border-[#c2ab80] bg-white p-3 font-normal">
                <option [ngValue]="0">Оберіть категорію</option>
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
              <p class="mt-1 text-xs text-[#b23a2e]">Оберіть категорію.</p>
            }
          </section>
          <section class="rounded-xl border border-[#dac7a2] bg-white p-5">
            <h2 class="mb-4 font-black">Опис</h2>
            <label class="block text-sm font-bold"
              >Короткий опис<input formControlName="shortDescription" class="mt-1 w-full rounded-lg border border-[#c2ab80] p-3 font-normal"
            /></label>
            <label class="mt-4 block text-sm font-bold"
              >Повний опис<textarea formControlName="description" class="mt-1 min-h-32 w-full rounded-lg border border-[#c2ab80] p-3 font-normal"></textarea
            ></label>
          </section>
          <section class="rounded-xl border border-[#dac7a2] bg-white p-5">
            <h2 class="mb-4 font-black">Ціна та наявність</h2>
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="block text-sm font-bold"
                >Ціна, ₴<input formControlName="price" type="number" min="0" step="0.01" class="mt-1 w-full rounded-lg border border-[#c2ab80] p-3 font-normal"
              /></label>
              <label class="block text-sm font-bold"
                >Стара ціна, ₴ (необов.)<input
                  formControlName="oldPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  class="mt-1 w-full rounded-lg border border-[#c2ab80] p-3 font-normal"
              /></label>
              <label class="block text-sm font-bold"
                >Вага / одиниця
                <select formControlName="packKey" class="mt-1 w-full rounded-lg border border-[#c2ab80] bg-white p-3 font-normal">
                  @for (pack of packOptions(); track pack.key) {
                    <option [value]="pack.key">{{ pack.label }}</option>
                  }
                </select>
              </label>
            </div>
            @if (invalid('price')) {
              <p class="mt-2 text-xs text-[#b23a2e]">Ціна має бути більшою за 0.</p>
            }
          </section>
        </div>

        <div class="space-y-5">
          <section class="rounded-xl border border-[#dac7a2] bg-white p-5">
            <h2 class="mb-4 font-black">Зображення</h2>
            <label
              class="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-[#c2ab80] bg-[#f5ecd8] px-4 py-7 text-center transition hover:border-[#e4a600]"
              [class.opacity-60]="uploading()"
              (dragover)="$event.preventDefault()"
              (drop)="onDrop($event)"
            >
              <input
                type="file"
                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                class="sr-only"
                [disabled]="uploading()"
                (change)="onFilePick($event)"
              />
              <span class="text-sm font-bold text-[#4e301a]">{{ uploading() ? 'Завантажуємо…' : 'Перетягніть фото сюди' }}</span>
              <span class="text-xs text-[#9c8461]">або натисніть, щоб обрати · JPG, PNG до 5 МБ</span>
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
                      <img
                        [src]="src"
                        [alt]="'Фото ' + (index + 1)"
                        class="h-full w-full object-cover"
                        (error)="markImageFailed(url)"
                      />
                    } @else {
                      <span class="grid h-full place-items-center text-xs text-[#9c8461]">фото</span>
                    }
                    @if (index === 0) {
                      <span class="absolute left-1 top-1 rounded-full bg-[#f5b800] px-1.5 text-[9px] font-extrabold text-[#2a1a0d]"
                        >головне</span
                      >
                    }
                    <button
                      type="button"
                      class="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-[#2a1a0d]/70 text-xs text-white"
                      [attr.aria-label]="'Видалити фото ' + (index + 1)"
                      (click)="removeImage(index)"
                    >
                      ×
                    </button>
                  </div>
                }
              </div>
              <p class="mt-2 text-xs text-[#9c8461]">Перетягніть, щоб змінити порядок. Перше — головне.</p>
            }
          </section>

          <section class="rounded-xl border border-[#dac7a2] bg-white p-5">
            <h2 class="mb-4 font-black">Налаштування</h2>
            <label class="flex items-center justify-between font-bold"
              >Активний <input formControlName="isActive" type="checkbox" class="h-5 w-5 accent-[#5b7a3a]"
            /></label>
            <p class="mb-4 text-xs text-[#9c8461]">Показувати в каталозі</p>
            <label class="flex items-center justify-between font-bold"
              >Рекомендований <input formControlName="isFeatured" type="checkbox" class="h-5 w-5 accent-[#5b7a3a]"
            /></label>
            <p class="mb-4 text-xs text-[#9c8461]">Виділити на головній</p>
            <label class="flex items-center justify-between font-bold"
              >В наявності <input formControlName="isAvailable" type="checkbox" class="h-5 w-5 accent-[#5b7a3a]"
            /></label>
            <p class="text-xs text-[#9c8461]">Можна додати в кошик</p>
          </section>

          <div class="flex gap-3">
            <button
              type="submit"
              class="flex-1 rounded-lg bg-[#f5b800] px-4 py-3 font-bold disabled:opacity-50"
              [disabled]="saving() || uploading()"
            >
              {{ saving() ? 'Зберігаємо…' : 'Зберегти' }}
            </button>
            <button type="button" class="rounded-lg border border-[#c2ab80] px-4 py-3 font-bold" (click)="back()">Скасувати</button>
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
  private readonly destroyRef = inject(DestroyRef);

  readonly id = Number(this.route.snapshot.paramMap.get('id')) || null;
  readonly categories = signal<{ id: number; name: string; children: { id: number; name: string }[] }[]>([]);
  readonly loading = signal(!!this.id);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly imageUrls = signal<string[]>([]);
  private readonly failedImageUrls = signal(new Set<string>());
  private dragFrom: number | null = null;

  readonly packOptions = signal(PACK_OPTIONS);
  readonly form = this.fb.group({
    name: ['', Validators.required],
    categoryId: [0, Validators.min(1)],
    shortDescription: [''],
    description: [''],
    price: [0, Validators.min(0.01)],
    oldPrice: [0],
    packKey: [PACK_OPTIONS[2].key as string, Validators.required],
    isActive: [true],
    isFeatured: [false],
    isAvailable: [true],
  });
  readonly slug = () =>
    this.form.controls.name.value
      .toLowerCase()
      .trim()
      .replace(/['’]/g, '')
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

  invalid(name: 'name' | 'categoryId' | 'price'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.saving());
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
          else this.toast.error(response.error ?? 'Не вдалося завантажити товар');
          this.loading.set(false);
        },
        error: (error) => {
          this.toast.error(extractApiError(error, 'Не вдалося завантажити товар'));
          this.loading.set(false);
        },
      });
  }

  patch(product: AdminProduct): void {
    const packKey = resolvePackKey(product.weight, product.weightUnit);
    if (!PACK_OPTIONS.some((pack) => pack.key === packKey)) {
      const label =
        product.weightUnit === 'шт'
          ? 'шт'
          : `${product.weight ?? ''} ${product.weightUnit ?? ''}`.trim() || 'Інше';
      this.packOptions.set([
        ...PACK_OPTIONS,
        {
          key: packKey,
          label: `${label} (поточне)`,
          weight: product.weight ?? 1,
          unit: product.weightUnit ?? 'г',
        },
      ]);
    } else {
      this.packOptions.set(PACK_OPTIONS);
    }

    this.form.patchValue({
      name: product.name,
      categoryId: product.categoryId,
      shortDescription: product.shortDescription ?? '',
      description: product.description ?? '',
      price: product.price,
      oldPrice: product.oldPrice ?? 0,
      packKey,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      isAvailable: product.isAvailable,
    });
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
      this.toast.error('Дозволені лише JPG та PNG.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.toast.error('Зображення має бути не більше 5 МБ.');
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
            this.toast.error(response.error ?? 'Не вдалося завантажити зображення');
          }
        },
        error: (error) => {
          this.uploading.set(false);
          this.toast.error(extractApiError(error, 'Не вдалося завантажити зображення'));
        },
      });
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving() || this.uploading()) return;
    this.saving.set(true);
    const value = this.form.getRawValue();
    const pack =
      this.packOptions().find((item) => item.key === value.packKey) ?? PACK_OPTIONS[2];
    const imageUrls = this.imageUrls();
    const payload: SaveProductRequest = {
      name: value.name,
      slug: this.slug(),
      categoryId: value.categoryId,
      shortDescription: value.shortDescription || null,
      description: value.description || null,
      price: value.price,
      oldPrice: value.oldPrice || null,
      weight: pack.weight,
      weightUnit: pack.unit,
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
          this.toast.success('Товар збережено');
          this.back();
        } else this.toast.error(response.error ?? 'Не вдалося зберегти товар');
      },
      error: (error) => {
        this.saving.set(false);
        this.toast.error(extractApiError(error, 'Не вдалося зберегти товар'));
      },
    });
  }

  back(): void {
    this.router.navigateByUrl('/admin/products');
  }
}
