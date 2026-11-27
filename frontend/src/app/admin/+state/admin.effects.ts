import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, exhaustMap, map, of, switchMap } from 'rxjs';
import { adminActions, UserPage } from './admin.actions';

export const loadUsers = createEffect(
  (actions: Actions = inject(Actions), http: HttpClient = inject(HttpClient)) =>
    actions.pipe(
      ofType(adminActions.loadUsers),
      switchMap(({ page, search }) =>
        http.get<UserPage>('/api/admin/users', { params: { page, search } }).pipe(
          map((users) => adminActions.usersLoaded({ users })),
          catchError((error: HttpErrorResponse) =>
            of(
              adminActions.usersFailed({
                message: error.error?.detail ?? 'Could not load the Supabase users.',
              }),
            ),
          ),
        ),
      ),
    ),
  { functional: true },
);

export const saveRole = createEffect(
  (actions: Actions = inject(Actions), http: HttpClient = inject(HttpClient)) =>
    actions.pipe(
      ofType(adminActions.saveRole),
      exhaustMap(({ userId, role, page, search }) =>
        http.put<void>('/api/admin/users/' + encodeURIComponent(userId) + '/role', { role }).pipe(
          switchMap(() => [
            adminActions.roleCompleted({ message: 'Role updated.' }),
            adminActions.loadUsers({ page, search }),
          ]),
          catchError((error: HttpErrorResponse) =>
            of(
              adminActions.roleCompleted({
                message:
                  error.error?.message ?? error.error?.detail ?? 'Could not update the role.',
              }),
            ),
          ),
        ),
      ),
    ),
  { functional: true },
);
