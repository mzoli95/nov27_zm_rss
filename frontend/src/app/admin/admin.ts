import { Component, Signal, WritableSignal, computed, inject, signal } from '@angular/core';
import { FieldTree, FormField, form, pattern, required } from '@angular/forms/signals';
import { Store } from '@ngrx/store';
import { AppRole } from '../auth/auth';
import { adminActions } from './+state/admin.actions';
import type { AdminState } from './+state/admin.reducer';
import { selectAdmin } from './+state/admin.selectors';
import { NewsSources } from './news-sources';

interface RoleFields {
  userId: string;
  role: AppRole;
}

@Component({
  imports: [FormField, NewsSources],
  template: `<h1 class="text-3xl font-bold">Administration</h1>
    <section class="mt-6 rounded-xl border border-line bg-white p-5">
      <h2 class="text-xl font-semibold">User roles</h2>
      <p class="mt-2 text-sm text-muted">Use the User UID from Supabase Authentication.</p>
      <form novalidate (submit)="save($event)" class="mt-4 grid gap-4 sm:grid-cols-3 sm:items-end">
        <label
          >User UID
          <input
            [formField]="fields.userId"
            [attr.aria-invalid]="userIdError() ? true : null"
            [attr.aria-describedby]="userIdError() ? 'admin-user-error' : null"
          />
        </label>
        <div>
          <label for="admin-role">Role</label>
          <select id="admin-role" [formField]="fields.role">
            @for (role of roles; track role) {
              <option [value]="role">{{ role }}</option>
            }
          </select>
        </div>
        <button class="primary" [disabled]="state().saving">Save role</button>
        @if (userIdError(); as error) {
          <p id="admin-user-error" class="text-sm text-red-700 sm:col-span-3">{{ error }}</p>
        }
      </form>
      @if (state().message) {
        <p class="mt-4" role="status">{{ state().message }}</p>
      }
    </section>
    <app-news-sources />
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
  protected readonly sections: readonly string[] = ['Alert rules', 'Delivery channels'];
  protected readonly roles: readonly AppRole[] = [AppRole.User, AppRole.Admin];
  protected readonly state: Signal<AdminState> = this.store.selectSignal(selectAdmin);
  private readonly model: WritableSignal<RoleFields> = signal({ userId: '', role: AppRole.User });
  protected readonly fields: FieldTree<RoleFields> = form(this.model, (path) => {
    required(path.userId, { message: 'Enter the Supabase User UID.' });
    pattern(path.userId, /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i, {
      message: 'Enter a valid user UUID.',
    });
  });
  private readonly submitted: WritableSignal<boolean> = signal(false);
  protected readonly userIdError: Signal<string | undefined> = computed(() =>
    this.submitted() || this.fields.userId().touched()
      ? this.fields.userId().errors()[0]?.message
      : undefined,
  );

  protected save(event: SubmitEvent): void {
    event.preventDefault();
    this.submitted.set(true);
    if (this.fields().invalid() || this.state().saving) return;
    this.store.dispatch(adminActions.saveRole(this.model()));
  }
}
