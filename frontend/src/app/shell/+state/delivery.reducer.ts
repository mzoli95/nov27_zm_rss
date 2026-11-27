import { createReducer, on } from '@ngrx/store';
import { ChannelOverview, ChannelPreference, deliveryActions } from './delivery.actions';

export interface DeliverySettings<T> {
  data: T;
  busy: boolean;
  error: string;
  message: string;
}
const prefs: DeliverySettings<ChannelPreference[]> = {
  data: [],
  busy: false,
  error: '',
  message: '',
};
const admin: DeliverySettings<ChannelOverview> = {
  data: { channels: [], recent: [] },
  busy: false,
  error: '',
  message: '',
};

export const deliveryPrefs = createReducer(
  prefs,
  on(deliveryActions.loadPreferences, () => ({ ...prefs, busy: true })),
  on(deliveryActions.savePreferences, (state) => ({
    ...state,
    busy: true,
    error: '',
    message: '',
  })),
  on(deliveryActions.preferencesLoaded, (_, { items, message }) => ({
    ...prefs,
    data: items,
    message,
  })),
  on(deliveryActions.preferencesFailed, (state, { error }) => ({ ...state, busy: false, error })),
);

export const deliveryAdmin = createReducer(
  admin,
  on(deliveryActions.loadChannels, deliveryActions.changeChannel, (state) => ({
    ...state,
    busy: true,
    error: '',
    message: '',
  })),
  on(deliveryActions.channelsLoaded, (_, { overview, message }) => ({
    ...admin,
    data: overview,
    message,
  })),
  on(deliveryActions.channelsFailed, (state, { error }) => ({ ...state, busy: false, error })),
);
