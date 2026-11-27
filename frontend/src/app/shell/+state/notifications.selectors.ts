import { createFeatureSelector } from '@ngrx/store';
import type { Inbox } from './notifications.actions';

export const selectInbox = createFeatureSelector<Inbox>('notifications');
