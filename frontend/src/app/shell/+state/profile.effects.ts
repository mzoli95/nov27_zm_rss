import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, exhaustMap, map, of, switchMap } from 'rxjs';
import { profileActions, ProfilePreferences } from './profile.actions';

const path: string = '/api/profile/preferences';
export const loadProfile = createEffect(
  (actions: Actions = inject(Actions), http: HttpClient = inject(HttpClient)) =>
    actions.pipe(
      ofType(profileActions.load),
      switchMap(() =>
        http.get<ProfilePreferences>(path).pipe(
          map((profile) => profileActions.loaded({ profile, saved: false })),
          catchError(() => of(profileActions.failed({ message: 'Could not load preferences.' }))),
        ),
      ),
    ),
  { functional: true },
);

export const saveProfile = createEffect(
  (actions: Actions = inject(Actions), http: HttpClient = inject(HttpClient)) =>
    actions.pipe(
      ofType(profileActions.save),
      exhaustMap(({ preferences }) =>
        http.put<void>(path, preferences).pipe(
          switchMap(() => http.get<ProfilePreferences>(path)),
          map((profile) => profileActions.loaded({ profile, saved: true })),
          catchError((error: HttpErrorResponse) =>
            of(
              profileActions.failed({
                message: error.error?.message ?? 'Could not save preferences.',
              }),
            ),
          ),
        ),
      ),
    ),
  { functional: true },
);
