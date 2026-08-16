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
  templateUrl: './admin-news-form.component.html',
  styleUrl: './admin-news-form.component.css',
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
