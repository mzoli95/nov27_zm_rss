import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { EMPTY, catchError, concatMap, map, merge, switchMap, timer } from 'rxjs';
import { Inbox, notificationActions } from './notifications.actions';

const path: string = '/api/notifications';
export const readInbox = createEffect(
  (actions: Actions = inject(Actions), http: HttpClient = inject(HttpClient)) =>
    actions.pipe(
      ofType(notificationActions.sync),
      switchMap(({ userId }) =>
        userId
          ? merge(
              timer(0, 60_000),
              actions.pipe(ofType(notificationActions.refresh, notificationActions.markRead)),
            ).pipe(
              concatMap((action) =>
                typeof action === 'number' || action.type === notificationActions.refresh.type
                  ? http.get<Inbox>(path).pipe(
                      map((inbox) => notificationActions.loaded({ inbox })),
                      catchError(() => EMPTY),
                    )
                  : http
                      .post<void>(
                        path + '/read',
                        {},
                        {
                          params: action.articleId === null ? {} : { articleId: action.articleId },
                        },
                      )
                      .pipe(
                        switchMap(() => http.get<Inbox>(path)),
                        map((inbox) => notificationActions.loaded({ inbox })),
                        catchError(() => EMPTY),
                      ),
              ),
            )
          : EMPTY,
      ),
    ),
  { functional: true },
);
