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
  templateUrl: './news-detail.component.html',
  styleUrl: './news-detail.component.css',
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
