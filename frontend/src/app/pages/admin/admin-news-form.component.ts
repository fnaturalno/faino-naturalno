import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { AdminNewsPost, SaveNewsRequest } from '../../models/news.models';
import { AdminService } from '../../services/admin.service';
import { extractApiError } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { sanitizeImageUrl } from '../../utils/sanitize-image-url';

@Component({
  selector: 'app-admin-news-form',
  imports: [ReactiveFormsModule, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink="/admin/news" class="mb-4 inline-block text-sm font-bold text-[var(--cinnamon-700)] hover:underline">
      {{ id ? ('admin.newsFormBackEdit' | transloco) : ('admin.newsFormBackNew' | transloco) }}
    </a>

    @if (loading()) {
      <div class="h-96 animate-pulse rounded-xl bg-[var(--kraft-100)]"></div>
    } @else {
      <form class="mx-auto max-w-3xl space-y-5" [formGroup]="form" (ngSubmit)="save()">
        <section class="rounded-xl border border-[#dac7a2] bg-white p-5">
          <h2 class="mb-4 font-black">{{ 'admin.newsSectionBasic' | transloco }}</h2>
          <div class="mb-3 flex rounded-lg bg-[#f5ecd8] p-1">
            <button
              type="button"
              class="flex-1 rounded-md px-3 py-1.5 text-sm font-bold"
              [class.bg-white]="langTab() === 'ua'"
              [class.shadow-sm]="langTab() === 'ua'"
              (click)="langTab.set('ua')"
            >
              {{ 'admin.tabUa' | transloco }}
            </button>
            <button
              type="button"
              class="flex-1 rounded-md px-3 py-1.5 text-sm font-bold"
              [class.bg-white]="langTab() === 'en'"
              [class.shadow-sm]="langTab() === 'en'"
              (click)="langTab.set('en')"
            >
              {{ 'admin.tabEn' | transloco }}
            </button>
          </div>

          @if (langTab() === 'ua') {
            <label class="block text-sm font-bold"
              >{{ 'admin.newsTitleUk' | transloco }}
              <input
                formControlName="titleUk"
                class="mt-1.5 w-full rounded-lg border border-[#c2ab80] px-3 py-2.5 outline-none focus:border-[#e4a600]"
              />
              @if (invalid('titleUk')) {
                <p class="mt-1 text-xs text-[#b23a2e]">{{ 'admin.newsReqTitle' | transloco }}</p>
              }
            </label>
            <label class="mt-4 block text-sm font-bold"
              >{{ 'admin.newsExcerptUk' | transloco }}
              <textarea
                formControlName="excerptUk"
                rows="3"
                class="mt-1.5 w-full rounded-lg border border-[#c2ab80] px-3 py-2.5 outline-none focus:border-[#e4a600]"
              ></textarea>
            </label>
            <label class="mt-4 block text-sm font-bold"
              >{{ 'admin.newsBodyUk' | transloco }}
              <textarea
                formControlName="bodyUk"
                rows="10"
                class="mt-1.5 w-full rounded-lg border border-[#c2ab80] px-3 py-2.5 outline-none focus:border-[#e4a600]"
              ></textarea>
              @if (showBodyError() && form.controls.isPublished.value && !form.controls.bodyUk.value.trim()) {
                <p class="mt-1 text-xs text-[#b23a2e]">{{ 'admin.newsReqBody' | transloco }}</p>
              }
            </label>
          } @else {
            <label class="block text-sm font-bold"
              >{{ 'admin.newsTitleEn' | transloco }}
              <input
                formControlName="titleEn"
                class="mt-1.5 w-full rounded-lg border border-[#c2ab80] px-3 py-2.5 outline-none focus:border-[#e4a600]"
              />
            </label>
            <label class="mt-4 block text-sm font-bold"
              >{{ 'admin.newsExcerptEn' | transloco }}
              <textarea
                formControlName="excerptEn"
                rows="3"
                class="mt-1.5 w-full rounded-lg border border-[#c2ab80] px-3 py-2.5 outline-none focus:border-[#e4a600]"
              ></textarea>
            </label>
            <label class="mt-4 block text-sm font-bold"
              >{{ 'admin.newsBodyEn' | transloco }}
              <textarea
                formControlName="bodyEn"
                rows="10"
                class="mt-1.5 w-full rounded-lg border border-[#c2ab80] px-3 py-2.5 outline-none focus:border-[#e4a600]"
              ></textarea>
            </label>
          }

          <p class="mt-4 text-xs text-[#9c8461]">
            {{ 'admin.slugHint' | transloco }} <strong>/news/{{ slug() }}</strong>
          </p>
        </section>

        <section class="rounded-xl border border-[#dac7a2] bg-white p-5">
          <h2 class="mb-4 font-black">{{ 'admin.newsSectionCover' | transloco }}</h2>
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
            <span class="text-sm font-bold text-[#4e301a]">{{
              uploading() ? ('admin.uploading' | transloco) : ('admin.newsDropCover' | transloco)
            }}</span>
            <span class="text-xs text-[#9c8461]">{{ 'admin.dropHint' | transloco }}</span>
          </label>

          @if (coverImageUrl()) {
            <div class="relative mt-4 aspect-[16/9] max-w-md overflow-hidden rounded-lg border border-[#eadcc0] bg-[#f5ecd8]">
              @if (previewUrl(); as src) {
                <img
                  [src]="src"
                  [alt]="'admin.newsCoverAlt' | transloco"
                  class="h-full w-full object-cover"
                  (error)="coverFailed.set(true)"
                />
              } @else {
                <span class="grid h-full place-items-center text-xs text-[#9c8461]">{{
                  'admin.photoFallback' | transloco
                }}</span>
              }
              <button
                type="button"
                class="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-[#2a1a0d]/70 text-sm text-white"
                [attr.aria-label]="'admin.newsRemoveCover' | transloco"
                (click)="removeCover()"
              >
                ×
              </button>
            </div>
          }
        </section>

        <section class="rounded-xl border border-[#dac7a2] bg-white p-5">
          <h2 class="mb-4 font-black">{{ 'admin.sectionSettings' | transloco }}</h2>
          <label class="flex items-center justify-between font-bold"
            >{{ 'admin.newsIsPublished' | transloco }}
            <input formControlName="isPublished" type="checkbox" class="h-5 w-5 accent-[#5b7a3a]" />
          </label>
          <p class="mb-4 text-xs text-[#9c8461]">{{ 'admin.newsIsPublishedHint' | transloco }}</p>
          <label class="flex items-center justify-between font-bold"
            >{{ 'admin.newsIsFeatured' | transloco }}
            <input formControlName="isFeatured" type="checkbox" class="h-5 w-5 accent-[#5b7a3a]" />
          </label>
          <p class="mb-4 text-xs text-[#9c8461]">{{ 'admin.newsIsFeaturedHint' | transloco }}</p>
          <label class="block text-sm font-bold"
            >{{ 'admin.newsPublishedAt' | transloco }}
            <input
              formControlName="publishedAtLocal"
              type="datetime-local"
              class="mt-1.5 w-full rounded-lg border border-[#c2ab80] px-3 py-2.5 outline-none focus:border-[#e4a600]"
            />
          </label>
          <p class="mt-1 text-xs text-[#9c8461]">{{ 'admin.newsPublishedAtHint' | transloco }}</p>
        </section>

        <div class="flex flex-wrap gap-3">
          <button
            type="submit"
            class="flex-1 rounded-lg bg-[#f5b800] px-4 py-3 font-bold disabled:opacity-50 sm:flex-none sm:min-w-[160px]"
            [disabled]="saving() || uploading()"
          >
            {{ saving() ? ('common.saving' | transloco) : ('common.save' | transloco) }}
          </button>
          <button
            type="button"
            class="rounded-lg border border-[#c2ab80] px-4 py-3 font-bold"
            (click)="back()"
          >
            {{ 'common.cancel' | transloco }}
          </button>
          @if (id) {
            <button
              type="button"
              class="ml-auto rounded-lg border border-[#b23a2e] px-4 py-3 font-bold text-[#b23a2e]"
              [disabled]="saving()"
              (click)="remove()"
            >
              {{ 'common.delete' | transloco }}
            </button>
          }
        </div>
      </form>
    }
  `,
})
export class AdminNewsFormComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly admin = inject(AdminService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);

  readonly id = Number(this.route.snapshot.paramMap.get('id')) || null;
  readonly loading = signal(!!this.id);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly coverImageUrl = signal<string | null>(null);
  readonly coverFailed = signal(false);
  readonly langTab = signal<'ua' | 'en'>('ua');
  readonly showBodyError = signal(false);

  readonly form = this.fb.group({
    titleUk: ['', Validators.required],
    titleEn: [''],
    excerptUk: [''],
    excerptEn: [''],
    bodyUk: [''],
    bodyEn: [''],
    isPublished: [false],
    isFeatured: [false],
    publishedAtLocal: [''],
  });

  readonly slug = () => this.slugFromTitle(this.form.controls.titleUk.value);

  constructor() {
    if (this.id) this.load();
  }

  invalid(name: 'titleUk'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.saving());
  }

  previewUrl(): string | null {
    if (this.coverFailed()) return null;
    return sanitizeImageUrl(this.coverImageUrl());
  }

  load(): void {
    this.admin
      .getNewsPost(this.id!)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) this.patch(response.data);
          else this.toast.error(response.error ?? this.i18n.translate('admin.newsLoadOneError'));
          this.loading.set(false);
        },
        error: (error) => {
          this.toast.error(extractApiError(error, this.i18n.translate('admin.newsLoadOneError')));
          this.loading.set(false);
        },
      });
  }

  patch(post: AdminNewsPost): void {
    this.form.patchValue({
      titleUk: post.titleUk ?? '',
      titleEn: post.titleEn ?? '',
      excerptUk: post.excerptUk ?? '',
      excerptEn: post.excerptEn ?? '',
      bodyUk: post.bodyUk ?? '',
      bodyEn: post.bodyEn ?? '',
      isPublished: post.isPublished,
      isFeatured: post.isFeatured,
      publishedAtLocal: toDatetimeLocal(post.publishedAt),
    });
    this.coverImageUrl.set(post.coverImageUrl ?? null);
    this.coverFailed.set(false);
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

  removeCover(): void {
    this.coverImageUrl.set(null);
    this.coverFailed.set(false);
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
            this.coverImageUrl.set(response.data.url);
            this.coverFailed.set(false);
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

  save(): void {
    this.form.markAllAsTouched();
    this.showBodyError.set(true);
    const value = this.form.getRawValue();
    if (this.form.invalid || this.saving() || this.uploading()) return;
    if (value.isPublished && !value.bodyUk.trim()) return;

    this.saving.set(true);
    const payload: SaveNewsRequest = {
      titleUk: value.titleUk.trim(),
      titleEn: value.titleEn.trim() || null,
      slug: this.slugFromTitle(value.titleUk) || null,
      excerptUk: value.excerptUk.trim() || null,
      excerptEn: value.excerptEn.trim() || null,
      bodyUk: value.bodyUk,
      bodyEn: value.bodyEn.trim() || null,
      coverImageUrl: this.coverImageUrl(),
      isPublished: value.isPublished,
      isFeatured: value.isFeatured,
      publishedAt: fromDatetimeLocal(value.publishedAtLocal),
    };

    const request = this.id
      ? this.admin.updateNews(this.id, payload)
      : this.admin.createNews(payload);

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.saving.set(false);
        if (response.success) {
          this.toast.success(this.i18n.translate('admin.newsSaved'));
          this.back();
        } else {
          this.toast.error(response.error ?? this.i18n.translate('admin.newsSaveError'));
        }
      },
      error: (error) => {
        this.saving.set(false);
        this.toast.error(extractApiError(error, this.i18n.translate('admin.newsSaveError')));
      },
    });
  }

  remove(): void {
    if (!this.id) return;
    const title = this.form.controls.titleUk.value || `#${this.id}`;
    if (!confirm(this.i18n.translate('admin.newsConfirmDelete', { title }))) return;
    this.saving.set(true);
    this.admin
      .deleteNews(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.saving.set(false);
          if (response.success) {
            this.toast.success(this.i18n.translate('admin.newsDeleted'));
            this.back();
          } else {
            this.toast.error(response.error ?? this.i18n.translate('admin.newsDeleteError'));
          }
        },
        error: (error) => {
          this.saving.set(false);
          this.toast.error(extractApiError(error, this.i18n.translate('admin.newsDeleteError')));
        },
      });
  }

  back(): void {
    void this.router.navigateByUrl('/admin/news');
  }

  private slugFromTitle(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/['’']/g, '')
      .replace(/[^a-zа-яіїєґ0-9]+/gi, '-')
      .replace(/^-|-$/g, '');
  }
}

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocal(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
