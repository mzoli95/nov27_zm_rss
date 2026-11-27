import { Component, WritableSignal, signal } from '@angular/core';
import { AdminUsers } from '../admin-users/admin-users';
import { NewsSources } from '../news-sources/news-sources';
import { AdminChannels } from '../admin-channels/admin-channels';

import { MessageTemplates } from '../message-templates/message-templates';
import { JobSchedules } from '../job-schedules/job-schedules';

enum AdminTab {
  Users = 'Users',
  Sources = 'News sources',
  Channels = 'Delivery channels',
  Templates = 'Message templates',
  Schedules = 'Scheduled jobs',
}

@Component({
  imports: [AdminUsers, NewsSources, AdminChannels, MessageTemplates, JobSchedules],
  templateUrl: './admin.html',
})
export class Admin {
  protected readonly AdminTab: typeof AdminTab = AdminTab;
  protected readonly active: WritableSignal<AdminTab> = signal(AdminTab.Users);
  protected readonly tabs: readonly AdminTab[] = [
    AdminTab.Users,
    AdminTab.Sources,
    AdminTab.Channels,
    AdminTab.Templates,
    AdminTab.Schedules,
  ];
  protected select(tab: AdminTab): void {
    this.active.set(tab);
  }
}
