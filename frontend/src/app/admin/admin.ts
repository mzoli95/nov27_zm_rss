import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
@Component({
  imports: [FormsModule],
  template: `<h1 class="text-3xl font-bold">Administration</h1>
    <section class="mt-6 rounded-xl border border-line bg-white p-5">
      <h2 class="text-xl font-semibold">User roles</h2>
      <p class="mt-2 text-sm text-muted">Use the User UID from Supabase Authentication.</p>
      <form #form="ngForm" (ngSubmit)="form.valid && save()" class="mt-4 grid gap-4 sm:grid-cols-3 sm:items-end">
        <label>User UID
          <input name="userId" [(ngModel)]="userId" required
            pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}">
        </label>
        <label>Role
          <select name="role" [(ngModel)]="role"><option>User</option><option>Admin</option></select>
        </label>
        <button class="primary" [disabled]="!form.valid || saving()">Save role</button>
      </form>
      @if (feedback()) { <p class="mt-4" role="status">{{ feedback() }}</p> }
    </section>
    <div class="mt-6 grid gap-4 sm:grid-cols-2">
      @for (section of sections; track section) {
        <section class="rounded-xl border border-line bg-white p-5">
          <h2 class="font-semibold">{{ section }}</h2><p class="mt-1 text-sm text-muted">Coming in a later milestone.</p>
        </section>
      }
    </div>`,
})
export class Admin {
  private readonly http = inject(HttpClient);
  private readonly destroy = inject(DestroyRef);
  protected readonly sections = ['Alert rules', 'News sources', 'Delivery channels'];
  protected readonly feedback = signal('');
  protected readonly saving = signal(false);
  protected userId = '';
  protected role = 'User';

  protected save() {
    if (this.saving()) return;
    this.feedback.set('');
    this.saving.set(true);
    this.http.put<void>('/api/admin/users/' + encodeURIComponent(this.userId.trim()) + '/role', { role: this.role })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => { this.feedback.set('Role updated.'); this.saving.set(false); },
        error: (error: HttpErrorResponse) => {
          this.feedback.set(error.error?.message ?? error.error?.detail ??
            (error.status === 404 ? 'User not found.' : 'Could not update the role.'));
          this.saving.set(false);
        },
      });
  }
}
