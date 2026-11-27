import { Component, Signal, WritableSignal, effect, inject, signal } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { Auth } from './auth/auth';
import { Store } from '@ngrx/store';
import { Inbox, notificationActions } from './shell/+state/notifications.actions';
import { selectInbox } from './shell/+state/notifications.selectors';

enum HeaderPanel {
  Account,
  Notifications,
}

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterOutlet],
  host: { '(document:keydown.escape)': 'panel.set(null)' },
  templateUrl: './app.html',
})
export class App {
  private readonly auth: Auth = inject(Auth);
  private readonly store: Store = inject(Store);
  private readonly router: Router = inject(Router);
  protected readonly HeaderPanel: typeof HeaderPanel = HeaderPanel;
  protected readonly signedIn: Signal<boolean> = this.auth.signedIn;
  protected readonly isAdmin: Signal<boolean> = this.auth.isAdmin;
  protected readonly panel: WritableSignal<HeaderPanel | null> = signal(null);
  protected readonly inbox: Signal<Inbox> = this.store.selectSignal(selectInbox);
  protected readonly signOutError: WritableSignal<string> = signal('');

  constructor() {
    effect(() =>
      this.store.dispatch(
        notificationActions.sync({
          userId: this.auth.signedIn() ? this.auth.userId() : null,
        }),
      ),
    );
    effect(() => {
      if (
        !this.signedIn() &&
        ['/', '/profile', '/liked-posts', '/notifications', '/admin'].includes(this.router.url)
      ) {
        void this.auth.ready.then(() => {
          if (!this.signedIn()) void this.router.navigateByUrl('/login');
        });
      }
    });
  }

  protected toggle(panel: HeaderPanel): void {
    if (panel === HeaderPanel.Account && this.panel() !== panel) this.auth.refreshAdmin();
    if (panel === HeaderPanel.Notifications && this.panel() !== panel)
      this.store.dispatch(notificationActions.refresh());
    this.panel.update((current) => (current === panel ? null : panel));
  }

  protected async signOut(): Promise<void> {
    this.panel.set(null);
    const client: SupabaseClient | null = this.auth.client();
    if (!client) return;
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) this.signOutError.set('Could not sign out. Please try again.');
    else await this.router.navigateByUrl('/login');
  }
}
