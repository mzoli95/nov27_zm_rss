import { HttpClient, httpResource } from '@angular/common/http';
import { Component, DestroyRef, WritableSignal, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FieldTree, FormField, form, maxLength, required } from '@angular/forms/signals';
import { Observable } from 'rxjs';

interface MessageTemplate {
  subject: string;
  introduction: string;
}

const endpoint: string = '/api/admin/message-template';

@Component({
  selector: 'app-message-templates',
  imports: [FormField],
  template: `
    <section class="rounded-2xl border border-line bg-white p-5 sm:p-7">
      <h2 class="text-xl font-semibold">Message templates</h2>
      <p class="mt-2 text-sm text-muted">Edit the shared notification subject and introduction.</p>
      @if (template.isLoading()) {
        <p class="mt-4" role="status">Loading template…</p>
      } @else if (template.error()) {
        <p class="mt-4 text-red-700" role="alert">Could not load the template.</p>
        <button class="mt-2 underline" type="button" (click)="template.reload()">Retry</button>
      } @else if (template.hasValue()) {
        <form class="mt-5 grid gap-4" (submit)="save($event)">
          <div>
            <label for="message-subject">Subject</label>
            <input id="message-subject" [formField]="fields.subject" aria-describedby="subject-help" />
            <p id="subject-help" class="text-sm text-muted">Use {{ countToken }} for the article count.</p>
          </div>
          <div>
            <label for="message-introduction">Introduction</label>
            <input id="message-introduction" [formField]="fields.introduction" />
          </div>
          <div class="flex flex-wrap gap-3">
            <button class="primary" [disabled]="busy() || fields().invalid()">Save template</button>
            <button type="button" class="rounded-md border border-line px-3 py-2"
              [disabled]="busy()" (click)="reset()">Restore default</button>
          </div>
        </form>
        <section aria-label="Sample message" class="mt-6 rounded-xl border border-line bg-page p-5">
          <h3 class="text-sm font-semibold text-primary">Preview · World Event Alerts</h3>
          <p class="mt-2 font-semibold">{{ model().subject.split(countToken).join('2') }}</p>
          <p class="mt-2">{{ model().introduction }}</p>
          <ul class="mt-3 list-disc space-y-2 pl-5 text-primary">
            <li>New observations reveal how sea turtles navigate</li>
            <li>Satellite tracks coastal wildlife migration</li>
          </ul>
          <p class="mt-3 text-sm text-muted">Top matching labels · wildlife (2)</p>
        </section>
      }
      @if (error()) {
        <p class="mt-4 text-red-700" role="alert">{{ error() }}</p>
      }
      @if (notice()) {
        <p class="mt-4 text-primary" role="status">{{ notice() }}</p>
      }
    </section>
  `,
})
export class MessageTemplates {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly destroy: DestroyRef = inject(DestroyRef);
  protected readonly template = httpResource<MessageTemplate>(() => endpoint);
  protected readonly countToken: string = '{count}';
  protected readonly model: WritableSignal<MessageTemplate> = signal({ subject: '', introduction: '' });
  protected readonly busy: WritableSignal<boolean> = signal(false);
  protected readonly error: WritableSignal<string> = signal('');
  protected readonly notice: WritableSignal<string> = signal('');
  protected readonly fields: FieldTree<MessageTemplate> = form(this.model, (schema) => {
    required(schema.subject);
    required(schema.introduction);
    maxLength(schema.subject, 120);
    maxLength(schema.introduction, 300);
  });

  constructor() {
    effect(() => {
      if (this.template.hasValue()) this.model.set(this.template.value());
    });
  }

  protected save(event: SubmitEvent): void {
    event.preventDefault();
    if (this.busy() || this.fields().invalid()) return;
    this.update(this.http.put<void>(endpoint, this.model()), 'Template saved.');
  }

  protected reset(): void {
    if (this.busy()) return;
    this.update(this.http.delete<void>(endpoint), 'Default template restored.');
  }

  private update(request: Observable<void>, notice: string): void {
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    request.pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: () => {
        this.notice.set(notice);
        this.busy.set(false);
        this.template.reload();
      },
      error: () => {
        this.error.set('Could not update the message template.');
        this.busy.set(false);
      },
    });
  }
}
