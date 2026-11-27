import { createFeatureSelector } from '@ngrx/store';
import { feedReducer } from './feed.reducer';

export const selectFeed = createFeatureSelector<ReturnType<typeof feedReducer>>('feed');
