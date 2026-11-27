import { createFeatureSelector } from '@ngrx/store';
import { ChannelOverview, ChannelPreference } from './delivery.actions';
import type { DeliverySettings } from './delivery.reducer';

export const selectDeliveryPreferences =
  createFeatureSelector<DeliverySettings<ChannelPreference[]>>('deliveryPrefs');
export const selectDeliveryAdmin =
  createFeatureSelector<DeliverySettings<ChannelOverview>>('deliveryAdmin');
