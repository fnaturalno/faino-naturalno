import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Subject, catchError, finalize, merge, of, switchMap } from 'rxjs';

import { IconComponent } from '../../components/icon/icon.component';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { LocaleService } from '../../i18n/locale.service';
import { SeoService } from '../../i18n/seo.service';
import { NewsListItem, NewsPage } from '../../models/news.models';
import { extractApiError } from '../../services/auth.service';
import { NewsService } from '../../services/news.service';
import { sanitizeImageUrl } from '../../utils/sanitize-image-url';

@Component({
  selector: 'app-news-list',
  imports: [NavbarComponent, RouterLink, TranslocoPipe, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './news-list.component.html',
  styleUrl: './news-list.component.css',
})
export class NewsListComponent {
  private readonly news = inject(NewsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject(TranslocoService);
  private readonly seo = inject(SeoService);
  protected readonly locale = inject(LocaleService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly page = signal<NewsPage | null>(null);
  protected readonly skeletons = Array.from({ length: 6 }, (_, i) => i);

  private readonly retry$ = new Subject<void>();
  private currentPage = 1;

  protected readonly pagination = computed<(number | 'ellipsis')[]>(() => {
    const total = this.page()?.totalPages ?? 0;
    const current = this.page()?.page ?? 1;
    if (total <= 7) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }
    const pages = new Set([1, total, current - 1, current, current + 1]);
    const sorted = [...pages].filter((p) => p > 0 && p <= total).sort((a, b) => a - b);
    const result: (number | 'ellipsis')[] = [];
    sorted.forEach((p, index) => {
      if (index && p - sorted[index - 1] > 1) result.push('ellipsis');
      result.push(p);
    });
    return result;
  });

  constructor() {
    effect(() => {
      this.locale.lang();
      this.seo.setAlternates('news', this.i18n.translate('news.docTitle'));
    });
    this.destroyRef.onDestroy(() => this.seo.clear());

    let firstLocale = true;
    effect(() => {
      this.locale.lang();
      if (firstLocale) {
        firstLocale = false;
        return;
      }
      untracked(() => this.retry$.next());
    });

    merge(
      this.route.queryParamMap.pipe(
        switchMap((params) => {
          const raw = Number(params.get('page'));
          const pageNum = Number.isInteger(raw) && raw > 0 ? raw : 1;
          if (params.has('page') && (pageNum === 1 || String(pageNum) !== params.get('page'))) {
            void this.router.navigate([], {
              relativeTo: this.route,
              queryParams: { page: pageNum === 1 ? null : pageNum },
              queryParamsHandling: 'merge',
              replaceUrl: true,
            });
            return of(null);
          }
          this.currentPage = pageNum;
          return of(pageNum);
        }),
      ),
      this.retry$.pipe(switchMap(() => of(this.currentPage))),
    )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((pageNum) => (pageNum == null ? of(null) : this.fetch(pageNum))),
      )
      .subscribe();
  }

  protected retry(): void {
    this.retry$.next();
  }

  private fetch(pageNum: number) {
    this.loading.set(true);
    this.error.set(null);
    return this.news.getNews(pageNum, 9).pipe(
      finalize(() => this.loading.set(false)),
      catchError((err) => {
        this.error.set(extractApiError(err, this.i18n.translate('news.errorLoad')));
        this.page.set(null);
        return of(null);
      }),
      switchMap((response) => {
        if (!response) return of(null);
        if (!response.success || !response.data) {
          this.error.set(response.error ?? this.i18n.translate('news.errorLoad'));
          this.page.set(null);
          return of(null);
        }
        this.page.set(response.data);
        if (response.data.page !== pageNum) {
          void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { page: response.data.page === 1 ? null : response.data.page },
            queryParamsHandling: 'merge',
            replaceUrl: true,
          });
        }
        return of(null);
      }),
    );
  }

  protected goToPage(page: number): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: page <= 1 ? null : page },
      queryParamsHandling: 'merge',
    });
  }

  protected coverSrc(post: NewsListItem): string | null {
    return sanitizeImageUrl(post.coverImageUrl);
  }

  protected formatDate(iso: string): string {
    return this.locale.formatDate(iso);
  }
}
