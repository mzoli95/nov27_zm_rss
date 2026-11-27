import { Component, Signal, WritableSignal, effect, inject, signal } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { Auth } from './auth/auth';

enum HeaderPanel {
  Account,
  Notifications,
}

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterOutlet],
  host: { '(document:keydown.escape)': 'panel.set(null)' },
  template: `
    <a href="#content" class="sr-only focus:not-sr-only">Skip to content</a>
    <div class="flex min-h-dvh flex-col">
      <header class="border-b border-line bg-white">
        <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a class="font-bold text-primary sm:text-lg" routerLink="/" (click)="panel.set(null)"
            >World Event Alerts</a
          >
          @if (signedIn()) {
            <nav class="flex items-center gap-2 sm:gap-4" aria-label="Account">
              <a class="px-2 text-sm font-medium" routerLink="/" (click)="panel.set(null)">Feed</a>
              <div class="relative">
                <button
                  type="button"
                  class="relative rounded-lg p-2 hover:bg-tint"
                  aria-label="Notifications"
                  [attr.aria-expanded]="panel() === HeaderPanel.Notifications"
                  (click)="toggle(HeaderPanel.Notifications)"
                >
                  <span aria-hidden="true" class="bi bi-bell block text-lg leading-none"></span>
                  @if (unread() > 0) {
                    <span
                      class="absolute -top-1 right-0 rounded-full bg-primary px-1 text-xs text-white"
                      >{{ unread() }}</span
                    >
                  }
                </button>
                @if (panel() === HeaderPanel.Notifications) {
                  <div class="menu-panel max-sm:-right-12">
                    <p class="px-3 py-2 text-sm text-muted">No notifications yet.</p>
                    <a class="menu-link" routerLink="/notifications" (click)="panel.set(null)"
                      >All notifications</a
                    >
                  </div>
                }
              </div>
              <div class="relative">
                <button
                  type="button"
                  class="flex items-center gap-2 rounded-lg p-2 hover:bg-tint"
                  aria-label="Account options"
                  [attr.aria-expanded]="panel() === HeaderPanel.Account"
                  (click)="toggle(HeaderPanel.Account)"
                >
                  <span
                    aria-hidden="true"
                    class="bi bi-person-circle block text-xl leading-none"
                  ></span>
                  <span
                    aria-hidden="true"
                    class="bi block text-xs leading-none text-muted"
                    [class.bi-chevron-up]="panel() === HeaderPanel.Account"
                    [class.bi-chevron-down]="panel() !== HeaderPanel.Account"
                  ></span>
                </button>
                @if (panel() === HeaderPanel.Account) {
                  <div class="menu-panel">
                    <a class="menu-link" routerLink="/profile" (click)="panel.set(null)">Profile</a>
                    <a class="menu-link" routerLink="/liked-posts" (click)="panel.set(null)"
                      >Liked posts</a
                    >
                    <a class="menu-link" routerLink="/notifications" (click)="panel.set(null)"
                      >Notifications</a
                    >
                    @if (isAdmin()) {
                      <a class="menu-link" routerLink="/admin" (click)="panel.set(null)"
                        >Administration</a
                      >
                    }
                    <button class="menu-link" (click)="signOut()">Sign out</button>
                  </div>
                }
              </div>
            </nav>
          }
        </div>
      </header>
      <main id="content" class="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        @if (signOutError()) {
          <p role="alert" class="mb-4">{{ signOutError() }}</p>
        }
        <router-outlet />
      </main>
      <footer class="border-t border-line bg-white">
        <div class="mx-auto max-w-6xl px-4 py-5 text-sm text-muted sm:px-6">World Event Alerts</div>
      </footer>
    </div>
  `,
})
export class App {
  private readonly auth: Auth = inject(Auth);
  private readonly router: Router = inject(Router);
  protected readonly HeaderPanel: typeof HeaderPanel = HeaderPanel;
  protected readonly signedIn: Signal<boolean> = this.auth.signedIn;
  protected readonly isAdmin: Signal<boolean> = this.auth.isAdmin;
  protected readonly panel: WritableSignal<HeaderPanel | null> = signal(null);
  protected readonly unread: Signal<number> = signal(0);
  protected readonly signOutError: WritableSignal<string> = signal('');

  constructor() {
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
