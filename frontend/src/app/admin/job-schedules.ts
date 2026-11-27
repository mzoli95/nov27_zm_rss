import { HttpClient, HttpErrorResponse, httpResource } from '@angular/common/http';
import { Component, DestroyRef, WritableSignal, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FieldTree, FormField, form } from '@angular/forms/signals';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';

interface ScheduleIntervals {
  importMinutes: number;
  archiveMinutes: number;
}

interface ScheduleSettings {
  intervals: ScheduleIntervals;
  importOptions: number[];
  archiveOptions: number[];
  importEnabled: boolean;
}

type ScheduleFields = Record<keyof ScheduleIntervals, string>;

const endpoint: string = '/api/admin/schedules';

@Component({
  selector: 'app-job-schedules',
  imports: [FormField, MatSnackBarModule],
  template: `
    <section class="rounded-2xl border border-line bg-white p-5 sm:p-7">
      <h2 class="text-xl font-semibold">Scheduled jobs</h2>
      @if (settings.isLoading()) {
        <p class="mt-4 text-muted" role="status">Loading schedules…</p>
      } @else if (settings.error()) {
        <p class="mt-4 text-red-700" role="alert">Could not load schedules.</p>
        <button class="mt-2 underline" type="button" (click)="settings.reload()">Retry</button>
      } @else if (settings.hasValue()) {
        <form class="mt-5 grid gap-5" (submit)="save($event)">
          <label>
            News source import (minutes)
            <select [formField]="fields.importMinutes">
              @for (minutes of settings.value().importOptions; track minutes) {
                <option [value]="minutes">{{ minutes }}</option>
              }
            </select>
          </label>
          @if (!settings.value().importEnabled) {
            <p class="text-sm text-muted">
              Scheduled importing is disabled in the backend configuration.
            </p>
          }
          <label>
            Article archive (minutes)
            <select [formField]="fields.archiveMinutes">
              @for (minutes of settings.value().archiveOptions; track minutes) {
                <option [value]="minutes">{{ minutes }}</option>
              }
            </select>
          </label>
          <p class="text-sm text-muted">
            The archive processes articles older than seven days. The 1,440-minute schedule runs
            daily at 02:15 UTC.
          </p>
          <div>
            <button
              class="primary inline-flex items-center gap-2"
              [disabled]="saving()"
              [attr.aria-busy]="saving()"
            >
              @if (saving()) {
                <span
                  class="size-4 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin"
                  aria-hidden="true"
                ></span>
              }
              {{ saving() ? 'Saving…' : 'Save schedules' }}
            </button>
          </div>
        </form>
      }
    </section>
  `,
})
export class JobSchedules {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly destroy: DestroyRef = inject(DestroyRef);
  private readonly snackBar: MatSnackBar = inject(MatSnackBar);
  protected readonly settings = httpResource<ScheduleSettings>(() => endpoint);
  protected readonly saving: WritableSignal<boolean> = signal(false);
  private readonly model: WritableSignal<ScheduleFields> = signal({
    importMinutes: '',
    archiveMinutes: '',
  });
  protected readonly fields: FieldTree<ScheduleFields> = form(this.model);

  constructor() {
    effect(() => {
      if (!this.settings.hasValue()) return;
      const { importMinutes, archiveMinutes } = this.settings.value().intervals;
      this.model.set({
        importMinutes: String(importMinutes),
        archiveMinutes: String(archiveMinutes),
      });
    });
  }

  protected save(event: SubmitEvent): void {
    event.preventDefault();
    if (this.saving()) return;
    this.saving.set(true);
    const { importMinutes, archiveMinutes } = this.model();
    this.http
      .put<void>(endpoint, {
        importMinutes: Number(importMinutes),
        archiveMinutes: Number(archiveMinutes),
      })
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => this.notify('Schedules saved. The new intervals are active.'),
        error: (error: HttpErrorResponse) =>
          this.notify(error.error?.message ?? 'Could not save schedules.'),
      });
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Dismiss', {
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
      duration: 7000,
    });
  }
}
