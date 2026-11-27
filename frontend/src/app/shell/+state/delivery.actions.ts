import { createActionGroup, emptyProps, props } from '@ngrx/store';

export interface ChannelPreference {
  channel: string;
  selected: boolean;
  available: boolean;
}
export interface ChannelSetting {
  channel: string;
  configured: boolean;
  enabled: boolean;
}
export interface DeliveryOutcome {
  articleId: number;
  channel: string;
  status: string;
  updatedAt: string;
}
export interface ChannelOverview {
  channels: ChannelSetting[];
  recent: DeliveryOutcome[];
}

export const deliveryActions = createActionGroup({
  source: 'Delivery settings',
  events: {
    'Load preferences': emptyProps(),
    'Save preferences': props<{ enabledChannels: string[] }>(),
    'Preferences loaded': props<{ items: ChannelPreference[]; message: string }>(),
    'Preferences failed': props<{ error: string }>(),
    'Load channels': emptyProps(),
    'Change channel': props<{ channel: string; enabled: boolean }>(),
    'Channels loaded': props<{ overview: ChannelOverview; message: string }>(),
    'Channels failed': props<{ error: string }>(),
  },
});
