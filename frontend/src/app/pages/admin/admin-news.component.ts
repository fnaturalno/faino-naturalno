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
  styleUrl: './admin-news.component.css',
  templateUrl: './admin-news.component.html',
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
