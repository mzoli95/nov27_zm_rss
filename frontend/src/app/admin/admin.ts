import { Component, Signal, WritableSignal, inject, signal } from '@angular/core';
import { FieldTree, FormField, form, pattern, required } from '@angular/forms/signals';
import { Store } from '@ngrx/store';
import { AppRole } from '../auth/auth';
import { adminActions } from './+state/admin.actions';
import type { AdminState } from './+state/admin.reducer';
import { selectAdmin } from './+state/admin.selectors';

interface RoleFields {
  userId: string;
  role: AppRole;
}

@Component({
  imports: [FormField],
  template: `<h1 class="text-3xl font-bold">Administration</h1>
    <section class="mt-6 rounded-xl border border-line bg-white p-5">
      <h2 class="text-xl font-semibold">User roles</h2>
      <p class="mt-2 text-sm text-muted">Use the User UID from Supabase Authentication.</p>
      <form (submit)="save($event)" class="mt-4 grid gap-4 sm:grid-cols-3 sm:items-end">
        <label
          >User UID
          <input [formField]="fields.userId" />
        </label>
        <div>
          <label for="admin-role">Role</label>
          <select id="admin-role" [formField]="fields.role">
            @for (role of roles; track role) {
              <option [value]="role">{{ role }}</option>
            }
          </select>
        </div>
        <button class="primary" [disabled]="fields().invalid() || state().saving">Save role</button>
      </form>
      @if (state().message) {
        <p class="mt-4" role="status">{{ state().message }}</p>
      }
    </section>
    <div class="mt-6 grid gap-4 sm:grid-cols-2">
      @for (section of sections; track section) {
        <section class="rounded-xl border border-line bg-white p-5">
          <h2 class="font-semibold">{{ section }}</h2>
          <p class="mt-1 text-sm text-muted">Coming in a later milestone.</p>
        </section>
      }
    </div>`,
})
export class Admin {
  private readonly store: Store = inject(Store);
  protected readonly sections: readonly string[] = [
    'Alert rules',
    'News sources',
    'Delivery channels',
  ];
  protected readonly roles: readonly AppRole[] = [AppRole.User, AppRole.Admin];
  protected readonly state: Signal<AdminState> = this.store.selectSignal(selectAdmin);
  private readonly model: WritableSignal<RoleFields> = signal({ userId: '', role: AppRole.User });
  protected readonly fields: FieldTree<RoleFields> = form(this.model, (path) => {
    required(path.userId);
    pattern(path.userId, /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i);
  });

  protected save(event: SubmitEvent): void {
    event.preventDefault();
    if (this.fields().invalid() || this.state().saving) return;
    this.store.dispatch(adminActions.saveRole(this.model()));
  }
}
