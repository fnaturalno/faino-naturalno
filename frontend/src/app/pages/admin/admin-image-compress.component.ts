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
  template: `
    <div class="mx-auto max-w-2xl space-y-6 text-[#2a1a0d]">
      <h2 class="text-2xl font-black">Стиснення зображень</h2>

      @if (files().length === 0) {
        <p class="font-semibold text-green-700">Усі зображення вже стиснені ✓</p>
      } @else {
        <ul class="overflow-hidden rounded-xl border border-[#dac7a2] bg-white">
          @for (name of files(); track name) {
            <li>
              <button
                type="button"
                class="w-full px-4 py-2 text-left font-medium hover:bg-[#fbf6ea]"
                (click)="fileName.set(name)"
              >
                {{ name }}
              </button>
            </li>
          }
        </ul>
      }

      <div class="flex gap-2">
        <input
          type="text"
          class="min-w-0 flex-1 rounded-lg border border-[#c2ab80] bg-white p-3"
          [value]="fileName()"
          (input)="fileName.set($any($event.target).value)"
          placeholder="ім'я файлу.jpg"
        />
        <button
          type="button"
          class="shrink-0 rounded-lg bg-[#f5b800] px-4 py-3 font-bold disabled:opacity-50"
          [disabled]="loading() || !fileName().trim()"
          (click)="compressOne()"
        >
          {{ loading() ? 'Обробка...' : 'Стиснути' }}
        </button>
      </div>

      @if (singleResult(); as result) {
        <p class="rounded-xl bg-green-50 px-4 py-3 font-medium text-green-800">
          ✓ {{ result.originalFile }} → {{ result.compressedFile }} |
          {{ result.originalKb }} KB → {{ result.compressedKb }} KB | оновлено записів у БД:
          {{ result.dbUpdated }}
        </p>
      }

      <hr class="border-[#dac7a2]" />

      <button
        type="button"
        class="rounded-lg bg-[#f5b800] px-4 py-3 font-bold disabled:opacity-50"
        [disabled]="loading() || files().length === 0"
        (click)="compressAll()"
      >
        {{ loading() ? 'Обробка...' : 'Стиснути всі (' + files().length + ')' }}
      </button>

      @if (allResult(); as result) {
        <div class="rounded-xl bg-green-50 px-4 py-3 font-medium text-green-800">
          <p>✓ Оброблено: {{ result.processed }} | Звільнено: {{ formatSaved(result.savedKb) }}</p>
          @if (result.errors.length > 0) {
            <ul class="mt-2 list-disc pl-5 text-red-700">
              @for (name of result.errors; track name) {
                <li>{{ name }}</li>
              }
            </ul>
          }
        </div>
      }

      @if (error(); as message) {
        <p class="rounded-xl bg-red-50 px-4 py-3 font-medium text-red-800">{{ message }}</p>
      }
    </div>
  `,
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
