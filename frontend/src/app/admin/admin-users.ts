import { Component, Signal, WritableSignal, inject, signal } from '@angular/core';
import { FieldTree, FormField, form, maxLength } from '@angular/forms/signals';
import { MatPaginatorModule } from '@angular/material/paginator';
import { Store } from '@ngrx/store';
import { AppRole, Auth } from '../auth/auth';
import { AdminUser, adminActions } from './+state/admin.actions';
import type { AdminState } from './+state/admin.reducer';
import { selectAdmin } from './+state/admin.selectors';

interface SearchFields {
  email: string;
}

@Component({
  selector: 'app-admin-users',
  imports: [FormField, MatPaginatorModule],
  templateUrl: './admin-users.html',
})
export class AdminUsers {
  private readonly store: Store = inject(Store);
  protected readonly state: Signal<AdminState> = this.store.selectSignal(selectAdmin);
  protected readonly currentUserId: Signal<string | null> = inject(Auth).userId;
  protected readonly AppRole: typeof AppRole = AppRole;
  private readonly model: WritableSignal<SearchFields> = signal({ email: '' });
  protected readonly fields: FieldTree<SearchFields> = form(this.model, (path) =>
    maxLength(path.email, 200),
  );
  private activeSearch: string = '';
  protected userCount(): number {
    const { total, page, pageSize, items } = this.state().users;
    return total ?? (page - 1) * pageSize + items.length + Number(items.length === pageSize);
  }
  constructor() {
    this.load(1);
  }
  protected load(page: number): void {
    this.store.dispatch(adminActions.loadUsers({ page, search: this.activeSearch }));
  }
  protected search(event: SubmitEvent): void {
    event.preventDefault();
    if (this.fields().invalid()) return;
    this.activeSearch = this.model().email.trim();
    this.load(1);
  }
  protected changeRole(user: AdminUser): void {
    const role: AppRole = user.role === AppRole.Admin ? AppRole.User : AppRole.Admin;
    this.store.dispatch(
      adminActions.saveRole({
        userId: user.id,
        role,
        page: this.state().users.page,
        search: this.activeSearch,
      }),
    );
  }
}
