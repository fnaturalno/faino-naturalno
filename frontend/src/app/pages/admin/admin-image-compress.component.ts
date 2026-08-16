import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';

import { ApiResponse } from '../../models/catalog.models';
import { extractApiError } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

interface CompressOneResult {
  originalFile: string;
  compressedFile: string;
  originalKb: number;
  compressedKb: number;
  dbUpdated: number;
}

interface CompressAllResult {
  processed: number;
  failed: number;
  savedKb: number;
  errors: string[];
}

@Component({
  selector: 'app-admin-image-compress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-image-compress.component.html',
  styleUrl: './admin-image-compress.component.css',
})
export class AdminImageCompressComponent {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/admin/uploads`;

  readonly files = signal<string[]>([]);
  readonly fileName = signal('');
  readonly loading = signal(false);
  readonly singleResult = signal<CompressOneResult | null>(null);
  readonly allResult = signal<CompressAllResult | null>(null);
  readonly error = signal<string | null>(null);

  constructor() {
    this.loadFiles();
  }

  protected formatSaved(savedKb: number): string {
    if (savedKb >= 1024) {
      return `${(savedKb / 1024).toFixed(1)} MB`;
    }
    return `${savedKb} KB`;
  }

  protected compressOne(): void {
    const name = this.fileName().trim();
    if (!name || this.loading()) {
      return;
    }

    this.loading.set(true);
    this.http
      .post<ApiResponse<CompressOneResult>>(
        `${this.baseUrl}/compress/${encodeURIComponent(name)}`,
        {},
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          if (response.success && response.data) {
            this.files.update((list) => list.filter((item) => item !== name));
            this.singleResult.set(response.data);
            this.error.set(null);
          } else {
            this.error.set(response.error ?? 'Не вдалося стиснути файл.');
            this.singleResult.set(null);
          }
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.error.set(extractApiError(err, 'Не вдалося стиснути файл.'));
          this.singleResult.set(null);
        },
      });
  }

  protected compressAll(): void {
    const count = this.files().length;
    if (count === 0 || this.loading()) {
      return;
    }

    if (!confirm(`Стиснути всі ${count} файлів? Цю дію не можна скасувати.`)) {
      return;
    }

    this.loading.set(true);
    this.http
      .post<ApiResponse<CompressAllResult>>(`${this.baseUrl}/compress-all`, {})
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          if (response.success && response.data) {
            this.files.set([]);
            this.allResult.set(response.data);
            this.error.set(null);
          } else {
            this.error.set(response.error ?? 'Не вдалося стиснути файли.');
          }
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.error.set(extractApiError(err, 'Не вдалося стиснути файли.'));
        },
      });
  }

  private loadFiles(): void {
    this.loading.set(true);
    this.http
      .get<ApiResponse<string[]>>(`${this.baseUrl}/uncompressed`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          if (response.success && response.data) {
            this.files.set(response.data);
            this.error.set(null);
          } else {
            this.error.set(response.error ?? 'Не вдалося завантажити список файлів.');
          }
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.error.set(extractApiError(err, 'Не вдалося завантажити список файлів.'));
        },
      });
  }
}
