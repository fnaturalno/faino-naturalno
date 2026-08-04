import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { IconComponent, IconName } from '../../components/icon/icon.component';
import { LocaleService } from '../../i18n/locale.service';
import { AdminCategory } from '../../models/admin.models';
import { AdminService } from '../../services/admin.service';
import { extractApiError } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

type DrawerMode = { id: number; parentId: number };

@Component({
  selector: 'app-admin-categories',
  imports: [TranslocoPipe, ReactiveFormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .ad-act {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 8px;
      border: 1.5px solid var(--border-subtle);
      background: white;
      color: var(--espresso-700);
      transition:
        border-color 0.15s ease,
        color 0.15s ease;
    }
    .ad-act:hover {
      border-color: var(--border-strong);
    }
    .ad-act.danger:hover {
      color: var(--chili-500, #b23a2e);
      border-color: var(--chili-500, #b23a2e);
    }
    .ad-row:hover {
      background: var(--kraft-50);
    }
  `,
  template: `
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
      <p class="m-0 text-[var(--espresso-700)]">
        <strong class="text-[var(--espresso-900)]">{{ nodeCount() }} {{ plural() }}</strong>
        <span class="text-[var(--text-muted)]"> {{ 'admin.withSubcategories' | transloco }}</span>
      </p>
      <button
        type="button"
        class="rounded-[10px] bg-[var(--marigold-400)] px-4 py-2.5 font-bold text-[var(--espresso-900)] hover:bg-[var(--marigold-500)]"
        (click)="openNew()"
      >
        {{ 'admin.addCategory' | transloco }}
      </button>
    </div>

    @if (error()) {
      <div class="rounded-[10px] border border-[var(--chili-500,#b23a2e)] bg-[#f5dcd3] p-4 text-[var(--espresso-800)]">
        {{ error() }}
        <button type="button" class="ml-2 underline" (click)="load()">{{ 'common.retry' | transloco }}</button>
      </div>
    } @else if (loading()) {
      <div class="h-72 animate-pulse rounded-[14px] bg-[var(--kraft-100)]"></div>
    } @else if (!categories().length) {
      <div class="rounded-[14px] border border-[var(--border-subtle)] bg-white p-10 text-center shadow-sm">
        <p class="mb-4 text-[var(--espresso-700)]">{{ 'admin.emptyCategories' | transloco }}</p>
        <button type="button" class="font-bold text-[var(--cinnamon-700,#7a3e18)] underline" (click)="openNew()">
          {{ 'admin.addCategory' | transloco }}
        </button>
      </div>
    } @else {
      <div
        class="overflow-hidden rounded-[14px] border border-[var(--border-subtle)] bg-white shadow-[0_1px_2px_rgba(42,26,13,0.04)]"
      >
        <div
          class="hidden grid-cols-[minmax(0,1fr)_240px_110px_130px] gap-3 border-b border-[var(--border-subtle)] bg-[var(--kraft-100)] px-5 py-3.5 sm:grid"
        >
          <span class="fn-eyebrow text-[10px]">{{ 'admin.colName' | transloco }}</span>
          <span class="fn-eyebrow text-[10px]">{{ 'admin.colSlug' | transloco }}</span>
          <span class="fn-eyebrow text-[10px]">{{ 'admin.colProducts' | transloco }}</span>
          <span class="fn-eyebrow text-right text-[10px]">{{ 'admin.colActions' | transloco }}</span>
        </div>

        @for (parent of categories(); track parent.id) {
          <div
            class="ad-row grid grid-cols-1 gap-3 border-b border-[var(--border-subtle)] px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_240px_110px_130px] sm:items-center sm:px-5"
          >
            <div class="flex min-w-0 items-center gap-2.5">
              <button
                type="button"
                class="grid size-6 shrink-0 place-items-center rounded-md text-[var(--espresso-700)] transition-transform"
                [class.rotate-90]="isOpen(parent.id)"
                [attr.aria-expanded]="isOpen(parent.id)"
                [attr.aria-label]="(isOpen(parent.id) ? ('admin.collapse' | transloco) : ('admin.expand' | transloco)) + ' ' + parent.name"
                (click)="toggle(parent.id)"
              >
                <app-icon name="chevron-right" [size]="16" />
              </button>
              <div
                class="grid size-[34px] shrink-0 place-items-center rounded-lg"
                [style.background]="accent(parent).bg"
                [style.color]="accent(parent).color"
              >
                <app-icon [name]="accent(parent).icon" [size]="18" />
              </div>
              <span class="truncate text-sm font-bold text-[var(--espresso-900)]" [title]="parent.name">{{
                parent.name
              }}</span>
              @if (parent.children?.length) {
                <span class="shrink-0 rounded-full bg-[var(--kraft-100)] px-2.5 py-0.5 text-xs text-[var(--text-muted)]">
                  {{ subLabel(parent.children.length) }}
                </span>
              }
            </div>
            <span class="truncate pl-8 text-sm text-[var(--text-muted)] sm:pl-0" [title]="'/' + parent.slug"
              >/{{ parent.slug }}</span
            >
            <span class="pl-8 text-sm text-[var(--espresso-700)] sm:pl-0">{{ parent.activeProductCount }}</span>
            <div class="flex justify-end gap-2 pl-8 sm:pl-0">
              <button type="button" class="ad-act" [title]="'admin.addSubcategory' | transloco" [attr.aria-label]="'admin.addSubTo' | transloco: { name: parent.name }" (click)="openNew(parent.id)">
                <app-icon name="plus" [size]="15" />
              </button>
              <button type="button" class="ad-act" [attr.aria-label]="'admin.editAria' | transloco: { name: parent.name }" (click)="openEdit(parent)">
                <app-icon name="pencil" [size]="15" />
              </button>
              <button type="button" class="ad-act danger" [attr.aria-label]="'admin.deleteAria' | transloco: { name: parent.name }" (click)="delete(parent)">
                <app-icon name="trash" [size]="15" />
              </button>
            </div>
          </div>

          @if (isOpen(parent.id)) {
            @for (child of parent.children; track child.id) {
              <div
                class="ad-row grid grid-cols-1 gap-3 border-b border-[var(--border-subtle)] bg-[var(--kraft-100)] px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_240px_110px_130px] sm:items-center sm:px-5"
              >
                <div class="flex min-w-0 items-center gap-2.5 pl-[18px]">
                  <span class="grid size-6 shrink-0 place-items-center text-[var(--kraft-400)]">
                    <app-icon name="corner-down-right" [size]="15" />
                  </span>
                  <div
                    class="grid size-7 shrink-0 place-items-center rounded-md bg-[var(--kraft-100)] text-[var(--kraft-500)] ring-1 ring-[var(--border-subtle)]"
                  >
                    <app-icon [name]="accent(parent).icon" [size]="15" />
                  </div>
                  <span class="truncate text-sm font-semibold text-[var(--espresso-900)]" [title]="child.name">{{
                    child.name
                  }}</span>
                </div>
                <span
                  class="truncate pl-8 text-sm text-[var(--text-muted)] sm:pl-0"
                  [title]="'/' + parent.slug + '/' + child.slug"
                  >/{{ parent.slug }}/{{ child.slug }}</span
                >
                <span class="pl-8 text-sm text-[var(--espresso-700)] sm:pl-0">{{ child.activeProductCount }}</span>
                <div class="flex justify-end gap-2 pl-8 sm:pl-0">
                  <button type="button" class="ad-act" [attr.aria-label]="'admin.editAria' | transloco: { name: child.name }" (click)="openEdit(child, parent.id)">
                    <app-icon name="pencil" [size]="15" />
                  </button>
                  <button type="button" class="ad-act danger" [attr.aria-label]="'admin.deleteAria' | transloco: { name: child.name }" (click)="delete(child)">
                    <app-icon name="trash" [size]="15" />
                  </button>
                </div>
              </div>
            }
          }
        }
      </div>
    }

    @if (drawer(); as current) {
      <div class="fixed inset-0 z-40 bg-[rgba(42,26,13,0.45)]" (click)="close()"></div>
      <aside
        class="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="drawerTitle()"
      >
        <header class="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-5">
          <h2 class="m-0 text-lg font-black text-[var(--espresso-900)]">{{ drawerTitle() }}</h2>
          <button type="button" class="ad-act" [attr.aria-label]="'common.close' | transloco" (click)="close()">
            <app-icon name="close" [size]="18" />
          </button>
        </header>

        <form class="flex min-h-0 flex-1 flex-col" [formGroup]="form" (ngSubmit)="save()">
          <div class="flex flex-1 flex-col gap-[18px] overflow-y-auto p-6">
            <div>
              <label class="mb-1.5 block text-sm font-semibold text-[var(--espresso-800)]" for="cat-parent"
                >{{ 'admin.parentCategory' | transloco }}</label
              >
              <div class="relative">
                <select
                  id="cat-parent"
                  formControlName="parentId"
                  class="w-full appearance-none rounded-[10px] border border-[var(--border-strong)] bg-white px-3.5 py-3 pr-10 text-base text-[var(--espresso-800)] outline-none focus:border-[var(--marigold-500)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option [ngValue]="0">{{ 'admin.rootCategory' | transloco }}</option>
                  @for (parent of parentOptions(); track parent.id) {
                    <option [ngValue]="parent.id">{{ parent.name }}</option>
                  }
                </select>
                <span class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--espresso-700)]">
                  <app-icon name="chevron-down" [size]="16" />
                </span>
              </div>
              <p class="mt-1.5 text-xs text-[var(--text-muted)]">{{ parentHint() }}</p>
            </div>

            <div class="flex gap-1 rounded-lg bg-[var(--kraft-100)] p-1">
              <button type="button" class="flex-1 rounded-md px-3 py-1.5 text-sm font-bold" [class.bg-white]="nameTab() === 'ua'" (click)="nameTab.set('ua')">{{ 'admin.tabUa' | transloco }}</button>
              <button type="button" class="flex-1 rounded-md px-3 py-1.5 text-sm font-bold" [class.bg-white]="nameTab() === 'en'" (click)="nameTab.set('en')">{{ 'admin.tabEn' | transloco }}</button>
            </div>
            @if (nameTab() === 'ua') {
              <label class="block text-sm font-semibold text-[var(--espresso-800)]"
                >{{ 'admin.catNameUk' | transloco }}
                <input
                  formControlName="nameUk"
                  class="mt-1.5 w-full rounded-[10px] border border-[var(--border-strong)] px-3.5 py-3 font-normal outline-none focus:border-[var(--marigold-500)]"
                />
              </label>
              @if (form.controls.nameUk.invalid && (form.controls.nameUk.touched || saving())) {
                <p class="-mt-1 text-xs text-[var(--chili-500,#b23a2e)]">{{ 'admin.reqCategoryName' | transloco }}</p>
              }
            } @else {
              <label class="block text-sm font-semibold text-[var(--espresso-800)]"
                >Name (English)
                <input
                  formControlName="nameEn"
                  class="mt-1.5 w-full rounded-[10px] border border-[var(--border-strong)] px-3.5 py-3 font-normal outline-none focus:border-[var(--marigold-500)]"
                />
              </label>
            }

            <div>
              <p class="mb-1.5 text-sm font-semibold text-[var(--espresso-800)]">
                {{ 'admin.slugAuto' | transloco }} <span class="font-normal text-[var(--text-muted)]">{{ 'admin.slugAutoHint' | transloco }}</span>
              </p>
              <div
                class="flex items-center gap-1.5 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--kraft-100)] px-3.5 py-3 text-sm"
              >
                <span class="text-[var(--kraft-500)]">/catalog?category=</span>
                <span class="truncate font-medium text-[var(--espresso-800)]">{{ slug() }}</span>
              </div>
            </div>

            <div class="flex gap-1 rounded-lg bg-[var(--kraft-100)] p-1">
              <button type="button" class="flex-1 rounded-md px-3 py-1.5 text-sm font-bold" [class.bg-white]="descTab() === 'ua'" (click)="descTab.set('ua')">{{ 'admin.tabUa' | transloco }}</button>
              <button type="button" class="flex-1 rounded-md px-3 py-1.5 text-sm font-bold" [class.bg-white]="descTab() === 'en'" (click)="descTab.set('en')">{{ 'admin.tabEn' | transloco }}</button>
            </div>
            @if (descTab() === 'ua') {
              <label class="block text-sm font-semibold text-[var(--espresso-800)]"
                >{{ 'admin.catDescUk' | transloco }} <span class="font-normal text-[var(--text-muted)]">{{ 'admin.descOptional' | transloco }}</span>
                <textarea
                  formControlName="descriptionUk"
                  [placeholder]="'admin.descPlaceholder' | transloco"
                  class="mt-1.5 min-h-[88px] w-full resize-y rounded-[10px] border border-[var(--border-strong)] px-3.5 py-3 font-normal outline-none focus:border-[var(--marigold-500)]"
                ></textarea>
              </label>
            } @else {
              <label class="block text-sm font-semibold text-[var(--espresso-800)]"
                >Description (English)
                <textarea
                  formControlName="descriptionEn"
                  placeholder="Short category description…"
                  class="mt-1.5 min-h-[88px] w-full resize-y rounded-[10px] border border-[var(--border-strong)] px-3.5 py-3 font-normal outline-none focus:border-[var(--marigold-500)]"
                ></textarea>
              </label>
            }
          </div>

          <div class="flex gap-3 border-t border-[var(--border-subtle)] px-6 py-[18px]">
            <button
              type="submit"
              class="flex-1 rounded-[10px] bg-[var(--marigold-400)] py-3 font-bold text-[var(--espresso-900)] disabled:opacity-50"
              [disabled]="saving()"
            >
              {{ saving() ? ('common.saving' | transloco) : ('common.save' | transloco) }}
            </button>
            <button
              type="button"
              class="rounded-[10px] border border-[var(--border-strong)] px-4 py-3 font-bold text-[var(--espresso-800)]"
              (click)="close()"
            >
              {{ 'common.cancel' | transloco }}
            </button>
          </div>
        </form>
      </aside>
    }
  `,
})
export class AdminCategoriesComponent {
  private readonly admin = inject(AdminService);
  private readonly i18n = inject(TranslocoService);
  private readonly locale = inject(LocaleService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly destroyRef = inject(DestroyRef);

  readonly categories = signal<AdminCategory[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly saving = signal(false);
  readonly drawer = signal<DrawerMode | null>(null);
  readonly expanded = signal<Record<number, boolean>>({});
  readonly nameTab = signal<'ua' | 'en'>('ua');
  readonly descTab = signal<'ua' | 'en'>('ua');

  readonly form = this.fb.group({
    nameUk: ['', Validators.required],
    nameEn: [''],
    descriptionUk: [''],
    descriptionEn: [''],
    parentId: [0],
  });

  readonly nodeCount = computed(
    () => this.categories().length + this.categories().reduce((sum, c) => sum + (c.children?.length ?? 0), 0),
  );

  readonly parentOptions = computed(() => {
    const current = this.drawer();
    return this.categories().filter((parent) => parent.id !== current?.id);
  });

  readonly slug = () =>
    this.form.controls.nameUk.value
      .toLowerCase()
      .trim()
      .replace(/['’]/g, '')
      .replace(/[^a-zа-яіїєґ0-9]+/gi, '-')
      .replace(/^-|-$/g, '') || 'nova-katehoriia';

  drawerTitle(): string {
    const current = this.drawer();
    if (!current) return '';
    const hasParent = (this.form.getRawValue().parentId ?? 0) > 0;
    if (current.id) return hasParent ? this.i18n.translate('admin.editSubcategory') : this.i18n.translate('admin.editCategory');
    return hasParent ? this.i18n.translate('admin.newSubcategory') : this.i18n.translate('admin.newCategory');
  }

  constructor() {
    this.load();
  }

  plural(): string {
    return this.i18n.translate(`plural.categories.${this.locale.pluralForm(this.nodeCount())}`);
  }

  subLabel(count: number): string {
    return this.i18n.translate(`plural.subcategories.${this.locale.pluralForm(count)}`, { count });
  }

  accent(category: AdminCategory): { icon: IconName; bg: string; color: string } {
    const slug = category.slug.toLowerCase();
    if (slug.includes('chai') || slug.includes('tea')) {
      return { icon: 'leaf', bg: 'var(--garden-100)', color: 'var(--garden-700)' };
    }
    if (slug.includes('pryprav') || slug.includes('soup')) {
      return { icon: 'package', bg: 'var(--garden-100)', color: 'var(--garden-700)' };
    }
    return { icon: 'flame', bg: 'var(--marigold-100)', color: 'var(--cinnamon-700, #7a3e18)' };
  }

  isOpen(id: number): boolean {
    return !!this.expanded()[id];
  }

  toggle(id: number): void {
    this.expanded.update((map) => ({ ...map, [id]: !map[id] }));
  }

  lockedAsParent(): boolean {
    const current = this.drawer();
    if (!current?.id) return false;
    const node = this.findById(current.id);
    return (node?.children?.length ?? 0) > 0;
  }

  parentHint(): string {
    const parentId = this.form.controls.parentId.value ?? 0;
    if (parentId) {
      const parent = this.categories().find((c) => c.id === parentId);
      return parent ? this.i18n.translate('admin.parentHintNested', { name: parent.name }) : '';
    }
    return this.i18n.translate('admin.parentHintRoot');
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.admin
      .getCategories({ bilingual: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.categories.set(response.data);
            this.expanded.update((map) => {
              const next = { ...map };
              for (const category of response.data) {
                if (next[category.id] === undefined) next[category.id] = true;
              }
              return next;
            });
          } else {
            this.error.set(response.error ?? this.i18n.translate('admin.loadCategoriesError'));
          }
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(extractApiError(error, this.i18n.translate('admin.loadCategoriesError')));
          this.loading.set(false);
        },
      });
  }

  openNew(parentId = 0): void {
    this.drawer.set({ id: 0, parentId });
    this.form.reset({ nameUk: '', nameEn: '', descriptionUk: '', descriptionEn: '', parentId });
    this.nameTab.set('ua');
    this.descTab.set('ua');
    this.form.controls.parentId.enable({ emitEvent: false });
    if (parentId) {
      this.expanded.update((map) => ({ ...map, [parentId]: true }));
    }
  }

  openEdit(category: AdminCategory, parentId = 0): void {
    this.drawer.set({ id: category.id, parentId: category.parentId ?? parentId });
    this.form.reset({
      nameUk: category.nameUk ?? category.name,
      nameEn: category.nameEn ?? '',
      descriptionUk: category.descriptionUk ?? category.description ?? '',
      descriptionEn: category.descriptionEn ?? '',
      parentId: category.parentId ?? parentId,
    });
    this.nameTab.set('ua');
    this.descTab.set('ua');
    if ((category.children?.length ?? 0) > 0) {
      this.form.controls.parentId.disable({ emitEvent: false });
    } else {
      this.form.controls.parentId.enable({ emitEvent: false });
    }
  }

  close(): void {
    this.form.controls.parentId.enable({ emitEvent: false });
    this.drawer.set(null);
  }

  save(): void {
    this.form.markAllAsTouched();
    const current = this.drawer();
    if (!current || this.form.invalid || this.saving()) return;
    this.saving.set(true);
    const parentId = this.lockedAsParent()
      ? null
      : this.form.getRawValue().parentId || null;
    const payload = {
      nameUk: this.form.controls.nameUk.value,
      nameEn: this.form.controls.nameEn.value.trim() || null,
      slug: this.slug(),
      descriptionUk: this.form.controls.descriptionUk.value.trim() || null,
      descriptionEn: this.form.controls.descriptionEn.value.trim() || null,
      parentId,
    };
    const request = current.id
      ? this.admin.updateCategory(current.id, payload)
      : this.admin.createCategory(payload);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.saving.set(false);
        if (response.success) {
          this.toast.success(this.i18n.translate('admin.categorySaved'));
          this.close();
          this.load();
        } else {
          this.toast.error(response.error ?? this.i18n.translate('admin.saveCategoryError'));
        }
      },
      error: (error) => {
        this.saving.set(false);
        this.toast.error(extractApiError(error, this.i18n.translate('admin.saveCategoryError')));
      },
    });
  }

  delete(category: AdminCategory): void {
    if (!confirm(this.i18n.translate('admin.confirmDeleteCategory', { name: category.name }))) return;
    this.admin
      .deleteCategory(category.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toast.success(this.i18n.translate('admin.categoryDeleted'));
            this.load();
          } else {
            this.toast.error(response.error ?? this.i18n.translate('admin.deleteCategoryError'));
          }
        },
        error: (error) => this.toast.error(extractApiError(error, this.i18n.translate('admin.deleteCategoryError'))),
      });
  }

  private findById(id: number): AdminCategory | undefined {
    for (const parent of this.categories()) {
      if (parent.id === id) return parent;
      const child = parent.children?.find((c) => c.id === id);
      if (child) return child;
    }
    return undefined;
  }
}
