import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Subject, catchError, finalize, merge, of, switchMap } from 'rxjs';

import { NavbarComponent } from '../../components/navbar/navbar.component';
import { LocaleService } from '../../i18n/locale.service';
import { SeoService } from '../../i18n/seo.service';
import { NewsDetail } from '../../models/news.models';
import { extractApiError } from '../../services/auth.service';
import { NewsService } from '../../services/news.service';
import { sanitizeImageUrl } from '../../utils/sanitize-image-url';

@Component({
  selector: 'app-news-detail',
  imports: [NavbarComponent, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fn-news-detail min-h-dvh bg-[var(--bg-page)] text-[var(--espresso-800)]">
      <app-navbar />

      <main class="relative overflow-hidden">
        <div
          class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(245_184_0_/_14%),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgb(91_122_58_/_10%),transparent_40%)]"
          aria-hidden="true"
        ></div>

        <div class="relative mx-auto max-w-3xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12 lg:px-8">
          <a
            [routerLink]="locale.commands('news')"
            class="inline-flex items-center gap-1 text-sm font-semibold text-[var(--cinnamon-700)] hover:underline"
          >
            {{ 'news.backToList' | transloco }}
          </a>

          @if (loading()) {
            <div class="mt-8 space-y-4" [attr.aria-label]="'news.loadingDetail' | transloco">
              <div class="h-4 w-1/4 animate-pulse rounded bg-[var(--kraft-200)]"></div>
              <div class="h-10 w-5/6 animate-pulse rounded bg-[var(--kraft-200)]"></div>
              <div class="aspect-[16/9] animate-pulse rounded-[var(--radius-md)] bg-[var(--kraft-200)]"></div>
              <div class="h-4 w-full animate-pulse rounded bg-[var(--kraft-200)]"></div>
              <div class="h-4 w-full animate-pulse rounded bg-[var(--kraft-200)]"></div>
              <div class="h-4 w-3/4 animate-pulse rounded bg-[var(--kraft-200)]"></div>
            </div>
          } @else if (notFound()) {
            <div class="mt-12 text-center">
              <p class="fn-eyebrow mb-3">{{ 'news.errorEyebrow' | transloco }}</p>
              <h1 class="m-0 text-2xl font-extrabold text-[var(--espresso-900)] sm:text-3xl">
                {{ 'news.notFoundTitle' | transloco }}
              </h1>
              <p class="mx-auto mt-3 max-w-md text-[var(--espresso-700)]">
                {{ 'news.notFoundBody' | transloco }}
              </p>
              <a
                [routerLink]="locale.commands('news')"
                class="mt-8 inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--marigold-400)] px-6 py-3 text-sm font-extrabold text-[var(--espresso-900)] hover:bg-[var(--marigold-500)]"
              >
                {{ 'news.backToList' | transloco }}
              </a>
            </div>
          } @else if (error()) {
            <div class="mt-12 text-center" role="alert">
              <p class="fn-eyebrow mb-3">{{ 'news.errorEyebrow' | transloco }}</p>
              <h1 class="m-0 text-2xl font-extrabold text-[var(--espresso-900)] sm:text-3xl">
                {{ 'news.errorTitle' | transloco }}
              </h1>
              <p class="mx-auto mt-3 max-w-md text-[var(--espresso-700)]">{{ error() }}</p>
              <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  class="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--marigold-400)] px-6 py-3 text-sm font-extrabold text-[var(--espresso-900)]"
                  (click)="retry()"
                >
                  {{ 'common.retry' | transloco }}
                </button>
                <a
                  [routerLink]="locale.commands('news')"
                  class="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] px-6 py-3 text-sm font-bold"
                >
                  {{ 'news.backToList' | transloco }}
                </a>
              </div>
            </div>
          } @else if (post(); as article) {
            <article class="mt-8">
              <time
                class="block text-sm font-semibold uppercase tracking-wide text-[var(--kraft-500)]"
                [attr.datetime]="article.publishedAt"
              >
                {{ formatDate(article.publishedAt) }}
              </time>
              <h1
                class="mt-3 m-0 font-[var(--font-display)] text-[clamp(1.75rem,4.5vw,2.75rem)] font-extrabold leading-[1.15] tracking-tight text-[var(--espresso-900)]"
              >
                {{ article.title }}
              </h1>

              @if (coverSrc(); as src) {
                <div class="mt-8 overflow-hidden rounded-[var(--radius-md)] bg-[var(--kraft-100)]">
                  <img [src]="src" [alt]="article.title" class="aspect-[16/9] w-full object-cover" />
                </div>
              }

              <div class="mt-8 whitespace-pre-wrap text-base leading-relaxed sm:text-lg">
                {{ article.body }}
              </div>
            </article>
          }
        </div>
      </main>
    </div>
  `,
})
export class NewsDetailComponent {
  private readonly news = inject(NewsService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject(TranslocoService);
  private readonly seo = inject(SeoService);
  protected readonly locale = inject(LocaleService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly notFound = signal(false);
  protected readonly post = signal<NewsDetail | null>(null);

  private readonly retry$ = new Subject<void>();

  constructor() {
    effect(() => {
      this.locale.lang();
      const article = this.post();
      if (article) {
        const brand = this.i18n.translate('brand');
        this.seo.setAlternates(`news/${article.slug}`, `${article.title} · ${brand}`);
      }
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

    merge(this.route.paramMap, this.retry$)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap(() => {
          const slug = this.route.snapshot.paramMap.get('slug') ?? '';
          this.loading.set(true);
          this.error.set(null);
          this.notFound.set(false);
          this.post.set(null);
          return this.news.getBySlug(slug).pipe(
            finalize(() => this.loading.set(false)),
            catchError((err) => {
              if (err instanceof HttpErrorResponse && err.status === 404) {
                this.notFound.set(true);
              } else {
                this.error.set(extractApiError(err, this.i18n.translate('news.errorLoad')));
              }
              return of(null);
            }),
          );
        }),
      )
      .subscribe((response) => {
        if (!response) return;
        if (!response.success || !response.data) {
          this.notFound.set(true);
          return;
        }
        this.post.set(response.data);
      });
  }

  protected retry(): void {
    this.retry$.next();
  }

  protected coverSrc(): string | null {
    return sanitizeImageUrl(this.post()?.coverImageUrl);
  }

  protected formatDate(iso: string): string {
    return this.locale.formatDate(iso);
  }
}
