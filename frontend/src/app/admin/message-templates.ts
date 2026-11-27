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
  templateUrl: './message-templates.html',
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
