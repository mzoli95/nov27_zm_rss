import { Component, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { Auth } from './auth/auth';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterOutlet],
  host: { '(document:keydown.escape)': 'panel.set(null)' },
  template: `
    <a href="#content" class="sr-only focus:not-sr-only">Skip to content</a>
    <div class="flex min-h-dvh flex-col">
      <header class="border-b border-line bg-white">
        <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a class="font-bold text-primary sm:text-lg" routerLink="/" (click)="panel.set(null)">World Event Alerts</a>
          @if (auth.session()) {
            <nav class="flex items-center gap-2 sm:gap-4" aria-label="Account">
              <a class="px-2 text-sm font-medium" routerLink="/" (click)="panel.set(null)">Feed</a>
              <div class="relative">
                <button type="button" class="relative rounded-lg p-2 hover:bg-tint" aria-label="Notifications"
                  [attr.aria-expanded]="panel() === 'notifications'" (click)="toggle('notifications')">
                  <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0"/>
                  </svg>
                  @if (unread() > 0) { <span class="absolute -top-1 right-0 rounded-full bg-primary px-1 text-xs text-white">{{ unread() }}</span> }
                </button>
                @if (panel() === 'notifications') {
                  <div class="menu-panel max-sm:-right-12">
                    <p class="px-3 py-2 text-sm text-muted">No notifications yet.</p>
                    <a class="menu-link" routerLink="/notifications" (click)="panel.set(null)">All notifications</a>
                  </div>
                }
              </div>
              <div class="relative">
                <button type="button" class="flex items-center gap-1 rounded-lg p-2 hover:bg-tint" aria-label="Account options"
                  [attr.aria-expanded]="panel() === 'account'" (click)="toggle('account')">
                  <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>
                  </svg>
                  <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor"
                    [class.rotate-180]="panel() === 'account'"><path d="m2 4 4 4 4-4"/></svg>
                </button>
                @if (panel() === 'account') {
                  <div class="menu-panel">
                    <a class="menu-link" routerLink="/profile" (click)="panel.set(null)">Profile</a>
                    <a class="menu-link" routerLink="/notifications" (click)="panel.set(null)">Notifications</a>
                    <button class="menu-link" (click)="signOut()">Sign out</button>
                  </div>
                }
              </div>
            </nav>
          }
        </div>
      </header>
      <main id="content" class="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        @if (signOutError()) { <p role="alert" class="mb-4">{{ signOutError() }}</p> }
        <router-outlet />
      </main>
      <footer class="border-t border-line bg-white">
        <div class="mx-auto max-w-6xl px-4 py-5 text-sm text-muted sm:px-6">World Event Alerts</div>
      </footer>
    </div>
  `,
})
export class App {
  protected readonly auth = inject(Auth);
  private readonly router = inject(Router);
  protected readonly panel = signal<'account' | 'notifications' | null>(null);
  protected readonly unread = signal(0);
  protected readonly signOutError = signal('');

  constructor() {
    effect(() => {
      if (!this.auth.session() && ['/', '/profile', '/notifications', '/admin'].includes(this.router.url)) {
        void this.auth.ready.then(() => {
          if (!this.auth.session()) void this.router.navigateByUrl('/login');
        });
      }
    });
  }

  protected toggle(panel: 'account' | 'notifications') {
    this.panel.update(current => current === panel ? null : panel);
  }

  protected async signOut() {
    this.panel.set(null);
    const client = this.auth.client();
    if (!client) return;
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) this.signOutError.set('Could not sign out. Please try again.');
    else await this.router.navigateByUrl('/login');
  }
}
