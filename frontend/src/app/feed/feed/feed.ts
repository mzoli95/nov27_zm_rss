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
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FieldTree, FormField, form } from '@angular/forms/signals';
import { Store } from '@ngrx/store';
import { Article, feedActions, FeedQuery, FeedSort } from '../+state/feed.actions';
import type { FeedState } from '../+state/feed.reducer';
import { selectFeed } from '../+state/feed.selectors';
import { articleImage } from '../article-image';

@Component({
  imports: [DatePipe, FormField],
  host: { class: 'mx-auto block max-w-3xl' },
  templateUrl: './feed.html',
})
export class Feed {
  protected readonly imageFor: typeof articleImage = articleImage;
  private readonly store: Store = inject(Store);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly router: Router = inject(Router);
  protected readonly likedOnly: boolean = this.route.snapshot.data['liked'] === true;
  protected readonly state: Signal<FeedState> = this.store.selectSignal(selectFeed);
  protected readonly topics: readonly string[] = [
    'General News',
    'Crypto',
    'Stock Market',
    'Natural Disasters',
    'Science & Technology',
    'Wildlife',
    'Cities',
    'Politics',
    'Economy',
  ];
  protected readonly placeholders: readonly number[] = [1, 2];
  protected readonly FeedSort: typeof FeedSort = FeedSort;
  private readonly query: WritableSignal<FeedQuery> = signal({
    topic: '',
    search: '',
    sort: FeedSort.Newest,
    liked: this.likedOnly,
    preferred: this.route.snapshot.queryParamMap.get('preferred') === 'true',
  });
  protected readonly fields: FieldTree<FeedQuery> = form(this.query);
  protected readonly applied: WritableSignal<FeedQuery> = signal(this.query());
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
    this.applyQuery();
  }

  protected showAll(): void {
    this.query.update((query) => ({ ...query, preferred: false, topic: '', search: '' }));
    this.applyQuery();
  }

  protected load(cursor: number | null = null): void {
    this.store.dispatch(feedActions.load({ query: this.applied(), cursor }));
  }

  private applyQuery(): void {
    this.applied.set(this.query());
    if (!this.likedOnly)
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { preferred: this.applied().preferred ? true : null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    this.load();
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
