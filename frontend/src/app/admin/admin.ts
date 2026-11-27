import { Component, WritableSignal, signal } from '@angular/core';
import { AdminUsers } from './admin-users';
import { NewsSources } from './news-sources';
import { AdminChannels } from './admin-channels';

enum AdminTab {
  Users = 'Users',
  Sources = 'News sources',
  Channels = 'Delivery channels',
}

@Component({
  imports: [AdminUsers, NewsSources, AdminChannels],
  template: `
    <h1 class="text-3xl font-bold">Administration</h1>
    <div class="mt-6 grid gap-5 md:grid-cols-[13rem_minmax(0,1fr)]">
      <nav
        class="flex flex-wrap gap-2 self-start rounded-xl border border-line bg-white p-2 md:grid"
        aria-label="Administration"
      >
        @for (tab of tabs; track tab) {
          <button
            type="button"
            class="rounded-lg px-3 py-2 text-left font-medium hover:bg-tint"
            [class.bg-tint]="active() === tab"
            [class.text-primary]="active() === tab"
            [attr.aria-current]="active() === tab ? 'page' : null"
            (click)="select(tab)"
          >
            {{ tab }}
          </button>
        }
      </nav>
      <div>
        @switch (active()) {
          @case (AdminTab.Users) {
            <app-admin-users />
          }
          @case (AdminTab.Sources) {
            <app-news-sources />
          }
          @case (AdminTab.Channels) {
            <app-admin-channels />
          }
        }
      </div>
    </div>
  `,
})
export class Admin {
  protected readonly AdminTab: typeof AdminTab = AdminTab;
  protected readonly active: WritableSignal<AdminTab> = signal(AdminTab.Users);
  protected readonly tabs: readonly AdminTab[] = [
    AdminTab.Users,
    AdminTab.Sources,
    AdminTab.Channels,
  ];
  protected select(tab: AdminTab): void {
    this.active.set(tab);
  }
}
