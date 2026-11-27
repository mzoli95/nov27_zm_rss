import {
  Component,
  ElementRef,
  Signal,
  WritableSignal,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FieldTree, FormField, form } from '@angular/forms/signals';
import { Store } from '@ngrx/store';
import { Article, feedActions, FeedQuery, FeedSort } from './+state/feed.actions';
import type { FeedState } from './+state/feed.reducer';
import { selectFeed } from './+state/feed.selectors';

@Component({
  imports: [DatePipe, FormField],
  host: { class: 'mx-auto block max-w-3xl' },
  template: `
    <h1 class="text-3xl font-bold sm:text-4xl">{{ likedOnly ? 'Liked posts' : 'News feed' }}</h1>
    <form
      class="my-6 grid gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-4 sm:items-end"
      (submit)="applyFilters($event)"
    >
      <label>Search<input [formField]="fields.search" placeholder="Search headlines" /></label>
      <label
        >Topic<select [formField]="fields.topic">
          <option value="">All topics</option>
          @for (topic of topics; track topic) {
            <option [value]="topic">{{ topic }}</option>
          }
        </select></label
      >
      <label
        >Sort by<select [formField]="fields.sort">
          <option [value]="FeedSort.Newest">Newest first</option>
          <option [value]="FeedSort.Oldest">Oldest first</option>
        </select></label
      >
      <button class="primary">Apply filters</button>
    </form>
    @if (state().error) {
      <p role="alert" class="mb-4">
        {{ state().error }}
        <button class="underline" (click)="load(state().nextCursor)">Retry</button>
      </p>
    }
    @if (state().likeError) {
      <p role="alert" class="mb-4">{{ state().likeError }}</p>
    }
    <div
      class="grid grid-cols-1 gap-5"
      aria-label="News articles"
      [attr.aria-busy]="state().loading"
    >
      @for (article of state().items; track article.id) {
        <article class="flex flex-col overflow-hidden rounded-xl border border-line bg-white">
          <div class="aspect-[16/7] bg-tint">
            @if (article.imageUrl) {
              <img
                [src]="article.imageUrl"
                alt=""
                loading="lazy"
                class="size-full object-cover"
                (error)="hideBrokenImage($event)"
              />
            }
          </div>
          <div class="flex flex-1 flex-col gap-2 p-5">
            <p class="text-sm font-medium text-primary">{{ article.topic }}</p>
            <h2 class="text-lg font-semibold">{{ article.title }}</h2>
            <p class="text-sm text-muted">
              {{ article.source }} · {{ article.publishedAt | date: 'mediumDate' }}
            </p>
            <p>{{ article.description }}</p>
            <div class="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
              <button
                type="button"
                class="rounded-lg border border-line px-3 py-2 font-medium text-primary hover:bg-tint"
                [attr.aria-pressed]="article.liked"
                [attr.aria-label]="'Like: ' + article.title"
                [disabled]="state().pendingLikes.includes(article.id)"
                (click)="toggleLike(article)"
              >
                {{ article.liked ? '♥ Liked' : '♡ Like' }}
              </button>
              <a
                class="ml-auto font-semibold text-primary hover:underline"
                [href]="article.url"
                [attr.aria-label]="'Continue reading: ' + article.title"
                target="_blank"
                rel="noopener noreferrer"
                >Continue reading →</a
              >
            </div>
          </div>
        </article>
      }
      @if (state().loading) {
        @for (placeholder of placeholders; track placeholder) {
          <div
            class="overflow-hidden rounded-xl border border-line bg-white motion-safe:animate-pulse"
            aria-hidden="true"
            data-feed-skeleton
          >
            <div class="aspect-[16/7] bg-tint"></div>
            <div class="grid gap-3 p-5">
              <div class="h-3 w-1/5 rounded bg-tint"></div>
              <div class="h-5 w-2/3 rounded bg-line"></div>
              <div class="h-3 w-full rounded bg-tint"></div>
            </div>
          </div>
        }
      }
    </div>
    @if (state().loading) {
      <p role="status" class="sr-only">Loading articles…</p>
    }
    @if (!state().loading && !state().error && !state().items.length) {
      <p>
        {{ likedOnly ? 'No liked posts match your filters.' : 'No articles match your filters.' }}
      </p>
    }
    @if (state().nextCursor !== null && !state().error) {
      <button
        #more
        class="primary mt-6"
        [disabled]="state().loading"
        (click)="load(state().nextCursor)"
      >
        Load more
      </button>
    }
  `,
})
export class Feed {
  private readonly store: Store = inject(Store);
  protected readonly likedOnly: boolean = inject(ActivatedRoute).snapshot.data['liked'] === true;
  protected readonly state: Signal<FeedState> = this.store.selectSignal(selectFeed);
  protected readonly topics: readonly string[] = [
    'General News',
    'Crypto',
    'Stock Market',
    'Natural Disasters',
    'Science & Technology',
  ];
  protected readonly placeholders: readonly number[] = [1, 2];
  protected readonly FeedSort: typeof FeedSort = FeedSort;
  private readonly query: WritableSignal<FeedQuery> = signal({
    topic: '',
    search: '',
    sort: FeedSort.Newest,
    liked: this.likedOnly,
  });
  protected readonly fields: FieldTree<FeedQuery> = form(this.query);
  private applied: FeedQuery = this.query();
  private readonly more: Signal<ElementRef<HTMLButtonElement> | undefined> = viewChild('more');

  constructor() {
    this.load();
    effect((onCleanup) => {
      const button: HTMLButtonElement | undefined = this.more()?.nativeElement;
      const { loading, nextCursor } = this.state();
      if (!button || loading || nextCursor === null) return;
      const observer: IntersectionObserver = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !this.state().loading)
          this.load(nextCursor);
      });
      observer.observe(button);
      onCleanup(() => observer.disconnect());
    });
  }

  protected applyFilters(event: SubmitEvent): void {
    event.preventDefault();
    this.applied = this.query();
    this.load();
  }

  protected load(cursor: number | null = null): void {
    this.store.dispatch(feedActions.load({ query: this.applied, cursor }));
  }

  protected hideBrokenImage(event: Event): void {
    if (event.currentTarget instanceof HTMLImageElement) event.currentTarget.hidden = true;
  }

  protected toggleLike(article: Article): void {
    if (this.state().pendingLikes.includes(article.id)) return;
    this.store.dispatch(
      feedActions.saveLike({ id: article.id, liked: !article.liked, likedOnly: this.likedOnly }),
    );
  }
}
