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
  styleUrl: './admin-categories.component.css',
  templateUrl: './admin-categories.component.html',
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
