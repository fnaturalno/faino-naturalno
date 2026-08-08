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
  template: `
    <div class="fn-news min-h-dvh bg-[var(--bg-page)] text-[var(--espresso-800)]">
      <app-navbar />

      <main class="relative overflow-hidden">
        <div
          class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(245_184_0_/_18%),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgb(91_122_58_/_12%),transparent_45%)]"
          aria-hidden="true"
        ></div>

        <div class="relative mx-auto max-w-[1100px] px-4 pb-20 pt-10 sm:px-6 sm:pt-14 lg:px-8 lg:pt-16">
          <p class="fn-eyebrow mb-4">{{ 'news.eyebrow' | transloco }}</p>
          <h1
            class="m-0 font-[var(--font-display)] text-[clamp(2rem,5vw,3rem)] font-extrabold leading-[1.1] tracking-tight text-[var(--espresso-900)]"
          >
            {{ 'news.title' | transloco }}
          </h1>
          <p class="mt-4 max-w-2xl text-base leading-relaxed text-[var(--espresso-700)] sm:text-lg">
            {{ 'news.subtitle' | transloco }}
          </p>

          @if (loading()) {
            <div
              class="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
              [attr.aria-label]="'news.loading' | transloco"
            >
              @for (skeleton of skeletons; track skeleton) {
                <div class="overflow-hidden">
                  <div class="aspect-[16/10] animate-pulse rounded-[var(--radius-md)] bg-[var(--kraft-200)]"></div>
                  <div class="mt-4 space-y-2.5">
                    <div class="h-3 w-1/3 animate-pulse rounded bg-[var(--kraft-200)]"></div>
                    <div class="h-5 w-5/6 animate-pulse rounded bg-[var(--kraft-200)]"></div>
                    <div class="h-4 w-full animate-pulse rounded bg-[var(--kraft-200)]"></div>
                    <div class="h-4 w-2/3 animate-pulse rounded bg-[var(--kraft-200)]"></div>
                  </div>
                </div>
              }
            </div>
          } @else if (error()) {
            <div
              class="mt-12 rounded-[var(--radius-lg)] border border-[var(--chili-100)] bg-white px-6 py-14 text-center"
              role="alert"
            >
              <h2 class="mb-3 text-xl">{{ 'news.errorTitle' | transloco }}</h2>
              <p class="mx-auto mb-6 max-w-md text-[var(--espresso-700)]">{{ error() }}</p>
              <button
                type="button"
                class="rounded-lg bg-[var(--marigold-400)] px-5 py-3 font-extrabold text-[var(--espresso-900)]"
                (click)="retry()"
              >
                {{ 'common.retry' | transloco }}
              </button>
            </div>
          } @else if (!page()?.items?.length) {
            <div
              class="mt-12 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-white px-6 py-14 text-center shadow-[var(--shadow-xs)]"
            >
              <div
                class="mx-auto mb-6 grid size-[100px] place-items-center rounded-full border border-[var(--border-subtle)] bg-[var(--kraft-100)] text-[var(--kraft-500)]"
              >
                <app-icon name="package" [size]="48" />
              </div>
              <h2 class="mb-2 text-xl">{{ 'news.emptyTitle' | transloco }}</h2>
              <p class="mx-auto max-w-md text-[var(--espresso-700)]">{{ 'news.emptyBody' | transloco }}</p>
            </div>
          } @else {
            <div class="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-7 lg:gap-y-10">
              @for (post of page()!.items; track post.id) {
                <a
                  [routerLink]="locale.commands('news', post.slug)"
                  class="group block text-[var(--espresso-800)] no-underline outline-none focus-visible:ring-2 focus-visible:ring-[var(--marigold-400)] focus-visible:ring-offset-2"
                >
                  <div
                    class="relative aspect-[16/10] overflow-hidden rounded-[var(--radius-md)] bg-[var(--kraft-100)]"
                  >
                    @if (coverSrc(post); as src) {
                      <img
                        [src]="src"
                        [alt]="post.title"
                        class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                    } @else {
                      <div
                        class="grid h-full place-items-center text-sm font-semibold text-[var(--kraft-500)]"
                      >
                        {{ 'common.photo' | transloco }}
                      </div>
                    }
                    @if (post.isFeatured) {
                      <span
                        class="absolute left-3 top-3 rounded bg-[var(--marigold-400)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--espresso-900)]"
                      >
                        {{ 'news.featured' | transloco }}
                      </span>
                    }
                  </div>
                  <time
                    class="mt-4 block text-xs font-semibold uppercase tracking-wide text-[var(--kraft-500)]"
                    [attr.datetime]="post.publishedAt"
                  >
                    {{ formatDate(post.publishedAt) }}
                  </time>
                  <h2
                    class="mt-1.5 line-clamp-2 m-0 font-[var(--font-display)] text-lg font-bold leading-snug text-[var(--espresso-900)] group-hover:text-[var(--cinnamon-700)] sm:text-xl"
                  >
                    {{ post.title }}
                  </h2>
                  @if (post.excerpt) {
                    <p class="mt-2 line-clamp-3 m-0 text-sm leading-relaxed text-[var(--espresso-700)]">
                      {{ post.excerpt }}
                    </p>
                  }
                </a>
              }
            </div>

            @if ((page()?.totalPages ?? 0) > 1) {
              <nav
                class="mt-12 flex items-center justify-center gap-1.5 sm:gap-2"
                [attr.aria-label]="'news.pagesAria' | transloco"
              >
                <button
                  type="button"
                  class="grid size-11 place-items-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  [attr.aria-label]="'news.prevPage' | transloco"
                  [disabled]="page()!.page <= 1"
                  (click)="goToPage(page()!.page - 1)"
                >
                  <app-icon name="chevron-left" [size]="18" />
                </button>
                @for (item of pagination(); track $index) {
                  @if (item === 'ellipsis') {
                    <span class="grid size-9 place-items-center sm:size-11" aria-hidden="true">…</span>
                  } @else {
                    <button
                      type="button"
                      class="size-11 rounded-[var(--radius-md)] border font-bold"
                      [class.border-[var(--espresso-800)]]="item === page()!.page"
                      [class.bg-[var(--espresso-800)]]="item === page()!.page"
                      [class.text-[var(--kraft-50)]]="item === page()!.page"
                      [class.border-[var(--border-subtle)]]="item !== page()!.page"
                      [class.bg-white]="item !== page()!.page"
                      [attr.aria-current]="item === page()!.page ? 'page' : null"
                      [attr.aria-label]="'news.pageN' | transloco: { page: item }"
                      (click)="goToPage(item)"
                    >
                      {{ item }}
                    </button>
                  }
                }
                <button
                  type="button"
                  class="grid size-11 place-items-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  [attr.aria-label]="'news.nextPage' | transloco"
                  [disabled]="page()!.page >= page()!.totalPages"
                  (click)="goToPage(page()!.page + 1)"
                >
                  <app-icon name="chevron-right" [size]="18" />
                </button>
              </nav>
            }
          }
        </div>
      </main>
    </div>
  `,
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
