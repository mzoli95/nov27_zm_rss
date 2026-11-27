import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, Observable, of, switchMap, map } from 'rxjs';
import { ChannelOverview, ChannelPreference, deliveryActions } from './delivery.actions';

const prefs: string = '/api/profile/channels';
const channels: string = '/api/admin/channels';

export const manageDeliveryPreferences = createEffect(
  (actions: Actions = inject(Actions), http: HttpClient = inject(HttpClient)) =>
    actions.pipe(
      ofType(deliveryActions.loadPreferences, deliveryActions.savePreferences),
      switchMap((action) => {
        const changed: boolean = action.type === deliveryActions.savePreferences.type;
        const work: Observable<ChannelPreference[]> =
          action.type === deliveryActions.savePreferences.type
            ? http
                .put<void>(prefs, { enabledChannels: action.enabledChannels })
                .pipe(switchMap(() => http.get<ChannelPreference[]>(prefs)))
            : http.get<ChannelPreference[]>(prefs);
        return work.pipe(
          map((items) =>
            deliveryActions.preferencesLoaded({
              items,
              message: changed ? 'Delivery preferences saved.' : '',
            }),
          ),
          catchError((error: HttpErrorResponse) =>
            of(
              deliveryActions.preferencesFailed({
                error: error.error?.message ?? 'Could not load or save delivery preferences.',
              }),
            ),
          ),
        );
      }),
    ),
  { functional: true },
);

export const manageDeliveryChannels = createEffect(
  (actions: Actions = inject(Actions), http: HttpClient = inject(HttpClient)) =>
    actions.pipe(
      ofType(deliveryActions.loadChannels, deliveryActions.changeChannel),
      switchMap((action) => {
        const changed: boolean = action.type === deliveryActions.changeChannel.type;
        const work: Observable<ChannelOverview> =
          action.type === deliveryActions.changeChannel.type
            ? http
                .put<void>(channels + '/' + encodeURIComponent(action.channel), {
                  enabled: action.enabled,
                })
                .pipe(switchMap(() => http.get<ChannelOverview>(channels)))
            : http.get<ChannelOverview>(channels);
        return work.pipe(
          map((overview) =>
            deliveryActions.channelsLoaded({
              overview,
              message: changed ? 'Channel updated.' : '',
            }),
          ),
          catchError((error: HttpErrorResponse) =>
            of(
              deliveryActions.channelsFailed({
                error: error.error?.message ?? 'Could not load or update delivery channels.',
              }),
            ),
          ),
        );
      }),
    ),
  { functional: true },
);
