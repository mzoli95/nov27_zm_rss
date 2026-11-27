import { DatePipe } from '@angular/common';
import { Component, Signal, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Inbox, notificationActions } from './+state/notifications.actions';
import { selectInbox } from './+state/notifications.selectors';

@Component({
  imports: [DatePipe],
  host: { class: 'mx-auto block max-w-3xl' },
  template: `
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-3xl font-bold">Notifications</h1>
      @if (inbox().unread > 0) {
        <button type="button" class="primary" (click)="markRead()">Mark all as read</button>
      }
    </div>
    <div class="mt-5 grid gap-3">
      @for (item of inbox().items; track item.id) {
        <article
          class="rounded-lg border border-line p-4"
          [class.bg-tint]="!item.read"
          [class.bg-white]="item.read"
        >
          <a
            [href]="item.url"
            target="_blank"
            rel="noopener noreferrer"
            class="font-medium text-primary hover:underline"
            >{{ item.title }}</a
          >
          <p class="mt-1 text-sm text-muted">
            {{ item.createdAt | date: 'medium' }}
            @if (!item.read) {
              · Unread
            }
          </p>
        </article>
      } @empty {
        <p class="text-muted">No notifications yet.</p>
      }
    </div>
  `,
})
export class Notifications {
  private readonly store: Store = inject(Store);
  protected readonly inbox: Signal<Inbox> = this.store.selectSignal(selectInbox);
  constructor() {
    this.store.dispatch(notificationActions.refresh());
  }
  protected markRead(): void {
    this.store.dispatch(notificationActions.markRead());
  }
}
