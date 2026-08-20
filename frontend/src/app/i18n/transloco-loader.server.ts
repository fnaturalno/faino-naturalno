import { Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { Observable, of } from 'rxjs';

import en from '../../../public/i18n/en.json';
import ua from '../../../public/i18n/ua.json';

const dictionaries: Record<string, Translation> = {
  ua: ua as Translation,
  en: en as Translation,
};

/**
 * Loads Transloco dictionaries without HTTP (SSR / serverless).
 * Browser loader remains HttpClient-based.
 */
@Injectable()
export class TranslocoServerLoader implements TranslocoLoader {
  getTranslation(lang: string): Observable<Translation> {
    return of(dictionaries[lang] ?? dictionaries['ua']);
  }
}
