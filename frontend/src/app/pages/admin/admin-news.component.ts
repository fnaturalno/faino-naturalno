import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { IconComponent } from '../../components/icon/icon.component';
import { LocaleService } from '../../i18n/locale.service';
import { AdminNewsPage, AdminNewsPost } from '../../models/news.models';
import { AdminService } from '../../services/admin.service';
import { extractApiError } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin-news',
  imports: [TranslocoPipe, RouterLink, IconComponent],
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
      color: var(--chili-500);
      border-color: var(--chili-500);
    }
    .ad-row:hover {
      background: var(--kraft-100);
    }
  `,
  template: `
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
      <p class="m-0 text-sm text-[var(--espresso-700)]">
        @if (!loading() && !error()) {
          <span>{{
            'admin.shownRange'
              | transloco: { first: first(), last: last(), total: page().totalCount }
          }}</span>
        }
      </p>
      <a
        routerLink="/admin/news/new"
        class="rounded-[10px] bg-[var(--marigold-400)] px-4 py-2.5 font-bold text-[var(--espresso-900)] hover:bg-[var(--marigold-500)]"
      >
        {{ 'admin.newsAdd' | transloco }}
      </a>
    </div>

    @if (error()) {
      <div class="rounded-[10px] border border-[var(--chili-500)] bg-[var(--chili-100)] p-4 text-[var(--espresso-800)]">
        {{ error() }}
        <button type="button" class="ml-2 underline" (click)="load()">{{ 'common.retry' | transloco }}</button>
      </div>
    } @else if (loading()) {
      <div class="h-72 animate-pulse rounded-[14px] bg-[var(--kraft-100)]"></div>
    } @else if (!posts().length) {
      <div class="rounded-[14px] border border-[var(--border-subtle)] bg-white p-10 text-center shadow-sm">
        <p class="mb-4 text-[var(--espresso-700)]">{{ 'admin.newsEmpty' | transloco }}</p>
        <a routerLink="/admin/news/new" class="font-bold text-[var(--cinnamon-700)] underline">{{
          'admin.newsAdd' | transloco
        }}</a>
      </div>
    } @else {
      <div
        class="overflow-hidden rounded-[14px] border border-[var(--border-subtle)] bg-white shadow-[0_1px_2px_rgba(42,26,13,0.04)]"
      >
        <div
          class="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_110px_140px_90px_100px] gap-3 border-b border-[var(--border-subtle)] bg-[var(--kraft-100)] px-5 py-3.5 lg:grid"
        >
          <span class="fn-eyebrow text-[10px]">{{ 'admin.newsColTitle' | transloco }}</span>
          <span class="fn-eyebrow text-[10px]">{{ 'admin.colSlug' | transloco }}</span>
          <span class="fn-eyebrow text-[10px]">{{ 'admin.colStatus' | transloco }}</span>
          <span class="fn-eyebrow text-[10px]">{{ 'admin.newsColPublished' | transloco }}</span>
          <span class="fn-eyebrow text-[10px]">{{ 'admin.newsColFeatured' | transloco }}</span>
          <span class="fn-eyebrow text-right text-[10px]">{{ 'admin.colActions' | transloco }}</span>
        </div>

        @for (post of posts(); track post.id) {
          <div
            class="ad-row grid grid-cols-1 gap-2 border-b border-[var(--border-subtle)] px-4 py-3.5 sm:gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_110px_140px_90px_100px] lg:items-center lg:px-5"
          >
            <div class="min-w-0">
              <span class="truncate text-sm font-bold text-[var(--espresso-900)]" [title]="post.titleUk">{{
                post.titleUk
              }}</span>
            </div>
            <span class="truncate text-sm text-[var(--text-muted)]" [title]="post.slug">/{{ post.slug }}</span>
            <span
              class="inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-bold"
              [class.bg-[var(--garden-100,#e8f0dc)]]="post.isPublished"
              [class.text-[var(--garden-700,#3d5a1f)]]="post.isPublished"
              [class.bg-[var(--kraft-100)]]="!post.isPublished"
              [class.text-[var(--kraft-500)]]="!post.isPublished"
            >
              {{
                post.isPublished
                  ? ('admin.newsStatusPublished' | transloco)
                  : ('admin.newsStatusDraft' | transloco)
              }}
            </span>
            <span class="text-sm text-[var(--espresso-700)]">
              {{ post.publishedAt ? formatDate(post.publishedAt) : '—' }}
            </span>
            <span class="text-sm font-semibold">
              {{ post.isFeatured ? ('common.yes' | transloco) : ('common.no' | transloco) }}
            </span>
            <div class="flex justify-end gap-2">
              <a
                class="ad-act"
                [routerLink]="['/admin/news', post.id, 'edit']"
                [attr.aria-label]="'admin.editAria' | transloco: { name: post.titleUk }"
              >
                <app-icon name="pencil" [size]="15" />
              </a>
              <button
                type="button"
                class="ad-act danger"
                [attr.aria-label]="'admin.deleteAria' | transloco: { name: post.titleUk }"
                (click)="remove(post)"
              >
                <app-icon name="trash" [size]="15" />
              </button>
            </div>
          </div>
        }
      </div>

      @if (page().totalPages > 1) {
        <div class="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            class="rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-sm font-semibold disabled:opacity-40"
            [disabled]="page().page <= 1"
            (click)="goToPage(page().page - 1)"
          >
            ←
          </button>
          @for (n of pageNumbers(); track n) {
            <button
              type="button"
              class="min-w-9 rounded-lg border px-3 py-2 text-sm font-semibold"
              [class.border-[var(--espresso-800)]]="n === page().page"
              [class.bg-[var(--espresso-800)]]="n === page().page"
              [class.text-[var(--kraft-50)]]="n === page().page"
              [class.border-[var(--border-subtle)]]="n !== page().page"
              [class.bg-white]="n !== page().page"
              [class.text-[var(--espresso-800)]]="n !== page().page"
              (click)="goToPage(n)"
            >
              {{ n }}
            </button>
          }
          <button
            type="button"
            class="rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-sm font-semibold disabled:opacity-40"
            [disabled]="page().page >= page().totalPages"
            (click)="goToPage(page().page + 1)"
          >
            →
          </button>
        </div>
      }
    }
  `,
})
export class AdminNewsComponent {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly locale = inject(LocaleService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly page = signal<AdminNewsPage>({
    items: [],
    page: 1,
    pageSize: 20,
    totalCount: 0,
    totalPages: 1,
  });

  readonly posts = computed(() => this.page().items ?? []);
  readonly first = computed(() =>
    this.page().totalCount ? (this.page().page - 1) * this.page().pageSize + 1 : 0,
  );
  readonly last = computed(() =>
    Math.min(this.page().page * this.page().pageSize, this.page().totalCount),
  );
  readonly pageNumbers = computed(() => {
    const total = Math.max(this.page().totalPages, 1);
    const current = this.page().page;
    const window = 5;
    let start = Math.max(1, current - Math.floor(window / 2));
    let end = Math.min(total, start + window - 1);
    start = Math.max(1, end - window + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.admin
      .getNews({ page: this.page().page, pageSize: this.page().pageSize })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          if (response.success && response.data) {
            const data = response.data;
            this.page.set({
              items: Array.isArray(data.items) ? data.items : [],
              page: data.page ?? 1,
              pageSize: data.pageSize ?? 20,
              totalCount: data.totalCount ?? 0,
              totalPages: Math.max(data.totalPages ?? 1, 1),
            });
          } else {
            this.error.set(response.error ?? this.i18n.translate('admin.newsLoadError'));
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(extractApiError(err, this.i18n.translate('admin.newsLoadError')));
        },
      });
  }

  goToPage(next: number): void {
    if (next < 1 || next > this.page().totalPages || next === this.page().page) return;
    this.page.update((value) => ({ ...value, page: next }));
    this.load();
  }

  remove(post: AdminNewsPost): void {
    if (!confirm(this.i18n.translate('admin.newsConfirmDelete', { title: post.titleUk }))) return;
    this.admin
      .deleteNews(post.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toast.success(this.i18n.translate('admin.newsDeleted'));
            this.load();
          } else {
            this.toast.error(response.error ?? this.i18n.translate('admin.newsDeleteError'));
          }
        },
        error: (err) =>
          this.toast.error(extractApiError(err, this.i18n.translate('admin.newsDeleteError'))),
      });
  }

  formatDate(iso: string): string {
    return this.locale.formatDate(iso);
  }
}
