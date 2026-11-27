import { DatePipe } from '@angular/common';
import { Component, Signal, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Inbox, notificationActions } from './+state/notifications.actions';
import { selectInbox } from './+state/notifications.selectors';

@Component({
  imports: [DatePipe],
  host: { class: 'mx-auto block max-w-3xl' },
  templateUrl: './notifications.html',
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
