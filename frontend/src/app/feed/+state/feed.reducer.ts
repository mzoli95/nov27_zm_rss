import { createReducer, on } from '@ngrx/store';
import { Article, feedActions } from './feed.actions';

export interface FeedState {
  items: Article[];
  nextCursor: number | null;
  loading: boolean;
  error: string;
  pendingLikes: number[];
  likeError: string;
}
const initial: FeedState = {
  items: [],
  nextCursor: null,
  loading: false,
  error: '',
  pendingLikes: [],
  likeError: '',
};

export const feedReducer = createReducer(
  initial,
  on(feedActions.load, (state, { cursor }) => ({
    ...(cursor === null ? initial : state),
    pendingLikes: state.pendingLikes,
    loading: true,
    error: '',
  })),
  on(feedActions.loaded, (state, { page, append }) => ({
    ...state,
    items: append ? [...state.items, ...page.items] : page.items,
    loading: false,
    error: '',
    nextCursor: page.nextCursor,
  })),
  on(feedActions.failed, (state, { message }) => ({ ...state, loading: false, error: message })),
  on(feedActions.saveLike, (state, { id }) => ({
    ...state,
    likeError: '',
    pendingLikes: [...state.pendingLikes, id],
  })),
  on(feedActions.likeFailed, (state, { id }) => ({
    ...state,
    likeError: 'Could not update the like. Try again.',
    pendingLikes: state.pendingLikes.filter((item) => item !== id),
  })),
  on(feedActions.likeSaved, (state, { id, liked, likedOnly }) => ({
    ...state,
    pendingLikes: state.pendingLikes.filter((item) => item !== id),
    items:
      likedOnly && !liked
        ? state.items.filter((article) => article.id !== id)
        : state.items.map((article) => (article.id === id ? { ...article, liked } : article)),
  })),
);
