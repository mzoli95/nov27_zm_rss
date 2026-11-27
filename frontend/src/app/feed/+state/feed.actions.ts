import { createActionGroup, props } from '@ngrx/store';

export enum FeedSort {
  Newest = 'newest',
  Oldest = 'oldest',
}
export interface FeedQuery {
  topic: string;
  search: string;
  sort: FeedSort;
  liked?: boolean;
}
export interface Article {
  id: number;
  title: string;
  description: string;
  topic: string;
  source: string;
  imageUrl: string | null;
  url: string;
  publishedAt: string;
  liked: boolean;
}
export interface FeedPage {
  items: Article[];
  nextCursor: number | null;
}

export const feedActions = createActionGroup({
  source: 'Feed',
  events: {
    Load: props<{ query: FeedQuery; cursor: number | null }>(),
    Loaded: props<{ page: FeedPage; append: boolean }>(),
    Failed: props<{ message: string }>(),
    'Save like': props<{ id: number; liked: boolean; likedOnly: boolean }>(),
    'Like saved': props<{ id: number; liked: boolean; likedOnly: boolean }>(),
    'Like failed': props<{ id: number }>(),
  },
});
