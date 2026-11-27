import { createActionGroup, emptyProps, props } from '@ngrx/store';

export interface Notification {
  id: number;
  title: string;
  url: string;
  createdAt: string;
  read: boolean;
}
export interface Inbox {
  unread: number;
  items: Notification[];
}
export const notificationActions = createActionGroup({
  source: 'News inbox',
  events: {
    Sync: props<{ userId: string | null }>(),
    Refresh: emptyProps(),
    'Mark read': emptyProps(),
    Loaded: props<{ inbox: Inbox }>(),
  },
});
