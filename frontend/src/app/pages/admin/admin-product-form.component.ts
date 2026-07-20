import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AdminProduct, SaveProductRequest } from '../../models/admin.models';
import { AdminService } from '../../services/admin.service';
import { extractApiError } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin-product-form',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="mb-5 rounded border border-[#c2ab80] bg-white px-3 py-2 text-sm" (click)="back()">← Товари / {{ id ? 'Редагувати товар' : 'Новий товар' }}</button>
    @if (loading()) { <div class="h-96 animate-pulse rounded-xl bg-[#f5ecd8]"></div> } @else {
      <form [formGroup]="form" (ngSubmit)="save()" class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div class="space-y-5">
          <section class="rounded-xl border border-[#dac7a2] bg-white p-5"><h2 class="mb-4 font-black">Основне</h2><label class="block text-sm font-bold">Назва товару<input formControlName="name" class="mt-1 w-full rounded-lg border border-[#c2ab80] p-3 font-normal" /></label>@if (invalid('name')) { <p class="mt-1 text-xs text-[#b23a2e]">Вкажіть назву товару.</p> }<p class="mt-4 rounded bg-[#f5ecd8] p-3 text-sm text-[#6a4425]">URL (slug) — генерується автоматично: <strong>/catalog/{{ slug() }}</strong></p><label class="mt-4 block text-sm font-bold">Категорія<select formControlName="categoryId" class="mt-1 w-full rounded-lg border border-[#c2ab80] bg-white p-3 font-normal"><option [ngValue]="0">Оберіть категорію</option>@for (category of categories(); track category.id) { <option [ngValue]="category.id">{{ category.name }}</option> }</select></label>@if (invalid('categoryId')) { <p class="mt-1 text-xs text-[#b23a2e]">Оберіть категорію.</p> }</section>
          <section class="rounded-xl border border-[#dac7a2] bg-white p-5"><h2 class="mb-4 font-black">Опис</h2><label class="block text-sm font-bold">Короткий опис<input formControlName="shortDescription" class="mt-1 w-full rounded-lg border border-[#c2ab80] p-3 font-normal" /></label><label class="mt-4 block text-sm font-bold">Повний опис<textarea formControlName="description" class="mt-1 min-h-32 w-full rounded-lg border border-[#c2ab80] p-3 font-normal"></textarea></label></section>
          <section class="rounded-xl border border-[#dac7a2] bg-white p-5"><h2 class="mb-4 font-black">Ціна та наявність</h2><div class="grid gap-4 sm:grid-cols-2">@for (field of numericFields; track field.name) { <label class="block text-sm font-bold">{{ field.label }}<input [formControlName]="field.name" type="number" min="0" class="mt-1 w-full rounded-lg border border-[#c2ab80] p-3 font-normal" /></label> }<label class="block text-sm font-bold">Одиниця<select formControlName="weightUnit" class="mt-1 w-full rounded-lg border border-[#c2ab80] bg-white p-3 font-normal">@for (unit of units; track unit) { <option [value]="unit">{{ unit }}</option> }</select></label></div>@if (invalid('price') || invalid('stockQuantity')) { <p class="mt-2 text-xs text-[#b23a2e]">Ціна має бути більшою за 0, залишок не може бути відʼємним.</p> }</section>
        </div>
        <div class="space-y-5"><section class="rounded-xl border border-[#dac7a2] bg-white p-5"><h2 class="mb-4 font-black">Зображення</h2><label class="block rounded-lg border-2 border-dashed border-[#c2ab80] bg-[#f5ecd8] p-5 text-center text-sm font-bold">URL зображень (кожне з нового рядка)<textarea formControlName="imageUrlsText" class="mt-3 min-h-28 w-full rounded border border-[#c2ab80] bg-white p-2 text-left font-normal"></textarea></label><p class="mt-2 text-xs text-[#9c8461]">Перше зображення буде головним.</p></section><section class="rounded-xl border border-[#dac7a2] bg-white p-5"><h2 class="mb-4 font-black">Налаштування</h2><label class="flex items-center justify-between font-bold">Активний <input formControlName="isActive" type="checkbox" class="h-5 w-5 accent-[#5b7a3a]" /></label><p class="mb-4 text-xs text-[#9c8461]">Показувати в каталозі</p><label class="flex items-center justify-between font-bold">Рекомендований <input formControlName="isFeatured" type="checkbox" class="h-5 w-5 accent-[#5b7a3a]" /></label><p class="text-xs text-[#9c8461]">Виділити на головній</p></section><div class="flex gap-3"><button type="submit" class="flex-1 rounded-lg bg-[#f5b800] px-4 py-3 font-bold disabled:opacity-50" [disabled]="saving()">{{ saving() ? 'Зберігаємо…' : 'Зберегти' }}</button><button type="button" class="rounded-lg border border-[#c2ab80] px-4 py-3 font-bold" (click)="back()">Скасувати</button></div></div>
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
  readonly categories = signal<{ id: number; name: string }[]>([]);
  readonly loading = signal(!!this.id);
  readonly saving = signal(false);
  readonly numericFields = [{ name: 'price', label: 'Ціна, ₴' }, { name: 'oldPrice', label: 'Стара ціна, ₴ (необов.)' }, { name: 'weight', label: 'Вага / обʼєм' }, { name: 'stockQuantity', label: 'Залишок на складі' }] as const;
  readonly units = ['г', 'кг', 'мл', 'л', 'шт'];
  readonly form = this.fb.group({ name: ['', Validators.required], categoryId: [0, Validators.min(1)], shortDescription: [''], description: [''], price: [0, Validators.min(0.01)], oldPrice: [0], weight: [0], weightUnit: ['г'], stockQuantity: [0, Validators.min(0)], imageUrlsText: [''], isActive: [true], isFeatured: [false] });
  readonly slug = () => this.form.controls.name.value.toLowerCase().trim().replace(/['’]/g, '').replace(/[^a-zа-яіїєґ0-9]+/gi, '-').replace(/^-|-$/g, '');

  constructor() { this.admin.getCategories().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(response => { if (response.success) this.categories.set(response.data); }); if (this.id) this.load(); }
  invalid(name: 'name' | 'categoryId' | 'price' | 'stockQuantity'): boolean { const control = this.form.controls[name]; return control.invalid && (control.touched || this.saving()); }
  load(): void { this.admin.getProduct(this.id!).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: response => { if (response.success) this.patch(response.data); else this.toast.error(response.error ?? 'Не вдалося завантажити товар'); this.loading.set(false); }, error: error => { this.toast.error(extractApiError(error, 'Не вдалося завантажити товар')); this.loading.set(false); } }); }
  patch(product: AdminProduct): void {
    this.form.patchValue({
      name: product.name,
      categoryId: product.categoryId,
      shortDescription: product.shortDescription ?? '',
      description: product.description ?? '',
      price: product.price,
      oldPrice: product.oldPrice ?? 0,
      weight: product.weight ?? 0,
      weightUnit: product.weightUnit ?? 'г',
      stockQuantity: product.stockQuantity,
      imageUrlsText: product.imageUrls.join('\n'),
      isActive: product.isActive,
      isFeatured: product.isFeatured,
    });
  }
  save(): void { this.form.markAllAsTouched(); if (this.form.invalid || this.saving()) return; this.saving.set(true); const value = this.form.getRawValue(); const imageUrls = value.imageUrlsText.split('\n').map(url => url.trim()).filter(Boolean); const payload: SaveProductRequest = { name: value.name, slug: this.slug(), categoryId: value.categoryId, shortDescription: value.shortDescription || null, description: value.description || null, price: value.price, oldPrice: value.oldPrice || null, weight: value.weight || null, weightUnit: value.weightUnit, stockQuantity: value.stockQuantity, imageUrl: imageUrls[0] ?? null, imageUrls, isActive: value.isActive, isFeatured: value.isFeatured }; const request = this.id ? this.admin.updateProduct(this.id, payload) : this.admin.createProduct(payload); request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: response => { this.saving.set(false); if (response.success) { this.toast.success('Товар збережено'); this.back(); } else this.toast.error(response.error ?? 'Не вдалося зберегти товар'); }, error: error => { this.saving.set(false); this.toast.error(extractApiError(error, 'Не вдалося зберегти товар')); } }); }
  back(): void { this.router.navigateByUrl('/admin/products'); }
}
