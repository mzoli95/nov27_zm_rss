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
  templateUrl: './job-schedules.html',
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
