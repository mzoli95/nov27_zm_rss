import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, mergeMap, of, switchMap } from 'rxjs';
import { feedActions, FeedPage } from './feed.actions';

export const loadFeed = createEffect(
  (actions = inject(Actions), http = inject(HttpClient)) =>
    actions.pipe(
      ofType(feedActions.load),
      switchMap(({ query, cursor }) =>
        http
          .get<FeedPage>('/api/feed', {
            params: { ...query, ...(cursor === null ? {} : { cursor }) },
          })
          .pipe(
            map((page) => feedActions.loaded({ page, append: cursor !== null })),
            catchError(() =>
              of(feedActions.failed({ message: 'Could not load articles. Please try again.' })),
            ),
          ),
      ),
    ),
  { functional: true },
);

export const saveLike = createEffect(
  (actions: Actions = inject(Actions), http: HttpClient = inject(HttpClient)) =>
    actions.pipe(
      ofType(feedActions.saveLike),
      mergeMap(({ id, liked, likedOnly }) =>
        http.put<void>('/api/feed/' + id + '/like', { liked }).pipe(
          map(() => feedActions.likeSaved({ id, liked, likedOnly })),
          catchError(() => of(feedActions.likeFailed({ id }))),
        ),
      ),
    ),
  { functional: true },
);
