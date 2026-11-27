import { createReducer, on } from '@ngrx/store';
import { Article, feedActions } from './feed.actions';

interface FeedState { items: Article[]; nextCursor: number | null; loading: boolean; error: string; }
const initial: FeedState = { items: [], nextCursor: null, loading: false, error: '' };

export const feedReducer = createReducer(
  initial,
  on(feedActions.load, (state, { cursor }) => ({
    ...(cursor === null ? initial : state), loading: true, error: '',
  })),
  on(feedActions.loaded, (state, { page, append }) => ({
    items: append ? [...state.items, ...page.items] : page.items,
    loading: false, error: '', nextCursor: page.nextCursor,
  })),
  on(feedActions.failed, (state, { message }) => ({ ...state, loading: false, error: message })),
);
