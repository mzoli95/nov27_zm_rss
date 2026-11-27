import { createReducer, on } from '@ngrx/store';
import { Inbox, notificationActions } from './notifications.actions';

const initial: Inbox = { unread: 0, items: [] };
export const notificationsReducer = createReducer(
  initial,
  on(notificationActions.sync, (): Inbox => initial),
  on(notificationActions.loaded, (_, { inbox }): Inbox => inbox),
);
