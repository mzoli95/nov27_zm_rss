import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { apiToken } from './auth/auth';
import { routes } from './app.routes';
import { loadFeed } from './feed/+state/feed.effects';
import { feedReducer } from './feed/+state/feed.reducer';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([apiToken])),
    provideStore({ feed: feedReducer }),
    provideEffects({ loadFeed }),
  ],
};
