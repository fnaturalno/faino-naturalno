import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { TRANSLOCO_LOADER } from '@jsverse/transloco';
import { provideServerRendering, withRoutes } from '@angular/ssr';

import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { TranslocoServerLoader } from './i18n/transloco-loader.server';
import { LOCAL_STORAGE } from './utils/browser-storage';

const noopStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: TRANSLOCO_LOADER, useClass: TranslocoServerLoader },
    { provide: LOCAL_STORAGE, useValue: noopStorage },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
