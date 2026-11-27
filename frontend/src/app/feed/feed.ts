import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { feedActions, FeedQuery } from './+state/feed.actions';
import { selectFeed } from './+state/feed.selectors';

@Component({
  imports: [DatePipe, FormsModule],
  host: { class: 'mx-auto block max-w-3xl' },
  template: `
    <h1 class="text-3xl font-bold sm:text-4xl">News feed</h1>
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
    <div class="grid grid-cols-1 gap-5" aria-label="News articles">
      @for (article of state().items; track article.id) {
        <article class="flex flex-col overflow-hidden rounded-xl border border-line bg-white">
          @if (article.imageUrl) {
            <img [src]="article.imageUrl" alt="" loading="lazy" class="aspect-video w-full object-cover">
          }
          <div class="flex flex-1 flex-col gap-2 p-5">
            <p class="text-sm font-medium text-primary">{{ article.topic }}</p>
            <h2 class="text-lg font-semibold">{{ article.title }}</h2>
            <p class="text-sm text-muted">{{ article.source }} · {{ article.publishedAt | date:'mediumDate' }}</p>
            <p>{{ article.description }}</p>
            <a class="mt-auto self-end pt-3 font-semibold text-primary hover:underline" [href]="article.url"
              [attr.aria-label]="'Continue reading: ' + article.title" target="_blank" rel="noopener noreferrer">Continue reading →</a>
          </div>
        </article>
      }
    </div>
    @if (state().loading) { <p role="status" class="mt-5">Loading articles…</p> }
    @if (!state().loading && !state().error && !state().items.length) {
      <p>No articles match your filters.</p>
    }
    @if (state().nextCursor !== null && !state().error) {
      <button #more class="primary mt-6" [disabled]="state().loading" (click)="load(state().nextCursor)">Load more</button>
    }
  `,
})
export class Feed {
  private readonly store = inject(Store);
  protected readonly state = this.store.selectSignal(selectFeed);
  protected readonly topics = ['General News', 'Crypto', 'Stock Market', 'Natural Disasters', 'Science & Technology'];
  protected query: FeedQuery = { topic: '', search: '', sort: 'newest' };
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
}
