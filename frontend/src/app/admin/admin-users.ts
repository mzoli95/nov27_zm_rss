import { Component, Signal, WritableSignal, inject, signal } from '@angular/core';
import { FieldTree, FormField, form, maxLength } from '@angular/forms/signals';
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
  imports: [FormField],
  template: ` <section class="rounded-2xl border border-line bg-white p-5 sm:p-7">
    <h2 class="text-xl font-semibold">Users</h2>
    <form class="mt-4 flex flex-wrap items-end gap-3" (submit)="search($event)">
      <label class="min-w-0 flex-1"
        >Search by email
        <input [formField]="fields.email" placeholder="Email address" />
      </label>
      <button class="primary" [disabled]="state().loading || state().saving">Search</button>
    </form>
    @if (state().error) {
      <p class="my-4 text-red-700" role="alert">{{ state().error }}</p>
    }
    @if (state().message) {
      <p class="my-4" role="status">{{ state().message }}</p>
    }
    <div class="my-4 divide-y divide-line">
      @for (user of state().users.items; track user.id) {
        <div class="flex flex-wrap items-center justify-between gap-3 py-3">
          <div class="min-w-0">
            <p class="break-all font-medium">{{ user.email ?? 'No email address' }}</p>
            <p class="text-sm text-muted">{{ user.role }}</p>
          </div>
          @if (user.id !== currentUserId()) {
            <button
              type="button"
              [disabled]="state().saving || state().loading"
              class="rounded-md border border-line px-3 py-1.5 text-primary"
              (click)="changeRole(user)"
            >
              {{ user.role === AppRole.Admin ? 'Make user' : 'Make admin' }}
            </button>
          }
        </div>
      } @empty {
        @if (!state().loading && !state().error) {
          <p>No users on this page.</p>
        }
      }
    </div>
    @if (state().loading) {
      <p role="status">Loading users…</p>
    }
    <nav class="flex flex-wrap items-center gap-3" aria-label="User pages">
      <button
        type="button"
        class="rounded-md border border-line px-3 py-1.5"
        [disabled]="state().loading || state().users.page === 1"
        (click)="load(state().users.page - 1)"
      >
        Previous
      </button>
      <span class="text-sm text-muted">Page {{ state().users.page }}</span>
      <button
        type="button"
        class="rounded-md border border-line px-3 py-1.5"
        [disabled]="state().loading || !state().users.hasNext"
        (click)="load(state().users.page + 1)"
      >
        Next
      </button>
      @if (state().error) {
        <button class="text-primary underline" type="button" (click)="load(state().users.page)">
          Retry
        </button>
      }
    </nav>
  </section>`,
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
