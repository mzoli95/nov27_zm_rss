import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, exhaustMap, map, of } from 'rxjs';
import { adminActions } from './admin.actions';

export const saveRole = createEffect(
  (actions: Actions = inject(Actions), http: HttpClient = inject(HttpClient)) =>
    actions.pipe(
      ofType(adminActions.saveRole),
      exhaustMap(({ userId, role }) =>
        http
          .put<void>('/api/admin/users/' + encodeURIComponent(userId.trim()) + '/role', { role })
          .pipe(
            map(() => adminActions.roleCompleted({ message: 'Role updated.' })),
            catchError((error: HttpErrorResponse) =>
              of(
                adminActions.roleCompleted({
                  message:
                    error.error?.message ??
                    error.error?.detail ??
                    (error.status === 404 ? 'User not found.' : 'Could not update the role.'),
                }),
              ),
            ),
          ),
      ),
    ),
  { functional: true },
);
