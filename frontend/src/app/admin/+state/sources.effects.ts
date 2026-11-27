import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Observable, catchError, exhaustMap, forkJoin, map, of, switchMap } from 'rxjs';
import { NewsSource, sourcesActions } from './sources.actions';

const path: string = '/api/admin/sources';
type SourceOverview = { topics: string[]; sources: NewsSource[]; message: string };
function fetchSources(http: HttpClient, message: string): Observable<SourceOverview> {
  return forkJoin({
    topics: http.get<string[]>('/api/topics'),
    sources: http.get<NewsSource[]>(path),
  }).pipe(map((result) => ({ ...result, message })));
}

export const manageSources = createEffect(
  (actions: Actions = inject(Actions), http: HttpClient = inject(HttpClient)) =>
    actions.pipe(
      ofType(sourcesActions.load, sourcesActions.save, sourcesActions.run),
      exhaustMap((action) => {
        let work: Observable<SourceOverview>;
        if (action.type === sourcesActions.save.type)
          work = http
            .post<void>(path, action.source)
            .pipe(switchMap(() => fetchSources(http, 'Source assignment saved.')));
        else if (action.type === sourcesActions.run.type)
          work = http
            .post<{ added: number }>(path + '/' + action.id + '/run', {})
            .pipe(
              switchMap((result) =>
                fetchSources(http, 'New items imported: ' + result.added + '.'),
              ),
            );
        else work = fetchSources(http, '');
        return work.pipe(
          map((result) => sourcesActions.loaded(result)),
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
