import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Observable, catchError, exhaustMap, forkJoin, map, of, switchMap } from 'rxjs';
import { SourcePage, sourcesActions } from './sources.actions';

const path: string = '/api/admin/sources';

function fetchPage(
  http: HttpClient,
  page: number,
  message: string,
  saved: boolean,
): Observable<ReturnType<typeof sourcesActions.loaded>> {
  return forkJoin({
    topics: http.get<string[]>('/api/topics'),
    sources: http.get<SourcePage>(path, { params: { page } }),
  }).pipe(
    switchMap((result) => {
      if (result.sources.items.length || page === 1)
        return of(sourcesActions.loaded({ ...result, message, saved }));
      const lastPage: number = Math.max(
        1,
        Math.ceil(result.sources.total / result.sources.pageSize),
      );
      return fetchPage(http, Math.min(lastPage, page - 1), message, saved);
    }),
  );
}

export const manageSources = createEffect(
  (actions: Actions = inject(Actions), http: HttpClient = inject(HttpClient)) =>
    actions.pipe(
      ofType(
        sourcesActions.load,
        sourcesActions.save,
        sourcesActions.run,
        sourcesActions.setAvailability,
        sourcesActions.test,
        sourcesActions.delete,
      ),
      exhaustMap((action) => {
        let work: Observable<
          ReturnType<typeof sourcesActions.loaded> | ReturnType<typeof sourcesActions.tested>
        >;
        switch (action.type) {
          case sourcesActions.save.type: {
            const request: Observable<void> =
              action.id === null
                ? http.post<void>(path, action.source)
                : http.put<void>(path + '/' + action.id, action.source);
            work = request.pipe(
              switchMap(() => fetchPage(http, action.page, 'Source saved.', true)),
            );
            break;
          }
          case sourcesActions.run.type:
            work = http
              .post<{ added: number }>(path + '/' + action.id + '/run', {})
              .pipe(
                switchMap((result) =>
                  fetchPage(
                    http,
                    action.page,
                    result.added === 0
                      ? 'Import completed. No new articles to add.'
                      : `Import completed. ${result.added} new article${result.added === 1 ? '' : 's'} added.`,
                    false,
                  ),
                ),
              );
            break;
          case sourcesActions.setAvailability.type:
            work = http
              .put<void>(path + '/' + action.id + '/availability', { enabled: action.enabled })
              .pipe(
                switchMap(() =>
                  fetchPage(
                    http,
                    action.page,
                    action.enabled ? 'Source enabled.' : 'Source disabled.',
                    false,
                  ),
                ),
              );
            break;
          case sourcesActions.delete.type:
            work = http
              .delete<void>(path + '/' + action.id)
              .pipe(switchMap(() => fetchPage(http, action.page, 'Source deleted.', false)));
            break;
          case sourcesActions.test.type:
            work = http
              .post<{ count: number }>(path + '/test', action.source)
              .pipe(map((result) => sourcesActions.tested(result)));
            break;
          default:
            work = fetchPage(http, action.page, '', false);
        }
        return work.pipe(
          catchError((error: HttpErrorResponse) =>
            of(
              sourcesActions.failed({
                message: error.error?.message ?? 'The source request failed.',
              }),
            ),
          ),
        );
      }),
    ),
  { functional: true },
);
