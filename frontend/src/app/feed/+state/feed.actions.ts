import { createActionGroup, props } from '@ngrx/store';

export interface FeedQuery { topic: string; search: string; sort: 'newest' | 'oldest'; }
export interface Article {
  id: number; title: string; description: string; topic: string; source: string;
  imageUrl: string | null; url: string; publishedAt: string;
}
export interface FeedPage { items: Article[]; nextCursor: number | null; }

export const feedActions = createActionGroup({
  source: 'Feed',
  events: {
    Load: props<{ query: FeedQuery; cursor: number | null }>(),
    Loaded: props<{ page: FeedPage; append: boolean }>(),
    Failed: props<{ message: string }>(),
  },
});
