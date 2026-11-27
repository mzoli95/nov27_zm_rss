import { Component, DestroyRef, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Article, feedActions, FeedQuery } from './+state/feed.actions';
import { selectFeed } from './+state/feed.selectors';

@Component({
  imports: [DatePipe, FormsModule],
  host: { class: 'mx-auto block max-w-3xl' },
  template: `
    <h1 class="text-3xl font-bold sm:text-4xl">{{ likedOnly ? 'Liked posts' : 'News feed' }}</h1>
    <form class="my-6 grid gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-4 sm:items-end"
      (ngSubmit)="load()">
      <label>Search<input name="search" [(ngModel)]="query.search" placeholder="Search headlines"></label>
      <label>Topic<select name="topic" [(ngModel)]="query.topic">
        <option value="">All topics</option>
        @for (topic of topics; track topic) { <option [value]="topic">{{ topic }}</option> }
      </select></label>
      <label>Sort by<select name="sort" [(ngModel)]="query.sort">
        <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
      </select></label>
      <button class="primary">Apply filters</button>
    </form>
    @if (state().error) {
      <p role="alert" class="mb-4">{{ state().error }} <button class="underline" (click)="load(state().nextCursor)">Retry</button></p>
    }
    @if (likeError()) { <p role="alert" class="mb-4">{{ likeError() }}</p> }
    <div class="grid grid-cols-1 gap-5" aria-label="News articles">
      @for (article of state().items; track article.id) {
        <article class="flex flex-col overflow-hidden rounded-xl border border-line bg-white">
          @if (article.imageUrl && !brokenImages().has(article.id)) {
            <img [src]="article.imageUrl" alt="" loading="lazy" class="aspect-video w-full object-cover" (error)="imageFailed(article.id)">
          } @else {
            <div class="h-28 bg-tint p-5 sm:h-36" aria-hidden="true">
              <div class="h-full rounded-lg border border-dashed border-line bg-page"></div>
            </div>
          }
          <div class="flex flex-1 flex-col gap-2 p-5">
            <p class="text-sm font-medium text-primary">{{ article.topic }}</p>
            <h2 class="text-lg font-semibold">{{ article.title }}</h2>
            <p class="text-sm text-muted">{{ article.source }} · {{ article.publishedAt | date:'mediumDate' }}</p>
            <p>{{ article.description }}</p>
            <div class="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
              <button type="button" class="rounded-lg border border-line px-3 py-2 font-medium text-primary hover:bg-tint"
                [attr.aria-pressed]="article.liked" [attr.aria-label]="'Like: ' + article.title"
                [disabled]="pending().has(article.id)" (click)="toggleLike(article)">{{ article.liked ? '♥ Liked' : '♡ Like' }}</button>
              <a class="ml-auto font-semibold text-primary hover:underline" [href]="article.url"
                [attr.aria-label]="'Continue reading: ' + article.title" target="_blank" rel="noopener noreferrer">Continue reading →</a>
            </div>
          </div>
        </article>
      }
    </div>
    @if (state().loading) { <p role="status" class="mt-5">Loading articles…</p> }
    @if (!state().loading && !state().error && !state().items.length) {
      <p>{{ likedOnly ? 'No liked posts match your filters.' : 'No articles match your filters.' }}</p>
    }
    @if (state().nextCursor !== null && !state().error) {
      <button #more class="primary mt-6" [disabled]="state().loading" (click)="load(state().nextCursor)">Load more</button>
    }
  `,
})
export class Feed {
  private readonly store = inject(Store);
  private readonly http = inject(HttpClient);
  private readonly destroy = inject(DestroyRef);
  protected readonly likedOnly = inject(ActivatedRoute).snapshot.data['liked'] === true;
  protected readonly pending = signal(new Set<number>());
  protected readonly brokenImages = signal(new Set<number>());
  protected readonly likeError = signal('');
  protected readonly state = this.store.selectSignal(selectFeed);
  protected readonly topics = ['General News', 'Crypto', 'Stock Market', 'Natural Disasters', 'Science & Technology'];
  protected query: FeedQuery = { topic: '', search: '', sort: 'newest', liked: this.likedOnly };
  private applied = { ...this.query };
  private readonly more = viewChild<ElementRef<HTMLButtonElement>>('more');

  constructor() {
    this.load();
    effect(onCleanup => {
      const button = this.more()?.nativeElement;
      const { loading, nextCursor } = this.state();
      if (!button || loading || nextCursor === null) return;
      const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting) && !this.state().loading) this.load(nextCursor);
      });
      observer.observe(button);
      onCleanup(() => observer.disconnect());
    });
  }

  protected load(cursor: number | null = null) {
    if (cursor === null) this.applied = { ...this.query };
    this.store.dispatch(feedActions.load({ query: this.applied, cursor }));
  }

  protected imageFailed(id: number) {
    this.brokenImages.update(ids => new Set([...ids, id]));
  }

  protected toggleLike(article: Article) {
    if (this.pending().has(article.id)) return;
    this.likeError.set('');
    this.pending.update(ids => new Set([...ids, article.id]));
    const liked = !article.liked;
    this.http.put<void>('/api/feed/' + article.id + '/like', { liked })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.store.dispatch(feedActions.likeSaved({ id: article.id, liked, likedOnly: this.likedOnly }));
          this.clearPending(article.id);
        },
        error: () => {
          this.likeError.set('Could not update the like. Try again.');
          this.clearPending(article.id);
        },
      });
  }

  private clearPending(id: number) {
    this.pending.update(ids => new Set([...ids].filter(pendingId => pendingId !== id)));
  }
}
