import { DatePipe } from '@angular/common';
import { Component, Signal, WritableSignal, inject, signal } from '@angular/core';
import { FieldTree, FormField, form, maxLength, required } from '@angular/forms/signals';
import { Store } from '@ngrx/store';
import { NewsSource, SourceInput, SourceKind, sourcesActions } from './+state/sources.actions';
import type { SourcesState } from './+state/sources.reducer';
import { selectSources } from './+state/sources.selectors';

@Component({
  selector: 'app-news-sources',
  imports: [DatePipe, FormField],
  template: `
    <section class="mt-6 rounded-xl border border-line bg-white p-5">
      <h2 class="text-xl font-semibold">News sources</h2>
      <p class="mt-2 text-sm text-muted">
        Assign the same source to multiple topics by saving each assignment. Keywords are
        comma-separated and optional.
      </p>
      <form class="my-5 grid gap-3 sm:grid-cols-2" (submit)="save($event)">
        <label>Source name<input [formField]="fields.name" /></label>
        <label>Source URL<input [formField]="fields.url" placeholder="https://" /></label>
        <div>
          <label for="source-kind">Source type</label>
          <select id="source-kind" [formField]="fields.kind">
            <option [value]="SourceKind.Rss">RSS or Atom</option>
            <option [value]="SourceKind.Usgs">USGS earthquakes</option>
          </select>
        </div>
        <div>
          <label for="source-topic">Topic</label>
          <select id="source-topic" [formField]="fields.topic">
            <option value="">Select a topic</option>
            @for (topic of state().topics; track topic) {
              <option [value]="topic">{{ topic }}</option>
            }
          </select>
        </div>
        <label class="sm:col-span-2"
          >Topic keywords<input
            [formField]="fields.keywords"
            placeholder="e.g. shares, stock market"
        /></label>
        <button class="primary sm:justify-self-start" [disabled]="state().busy">
          Save source assignment
        </button>
      </form>
      @if (validation()) {
        <p class="mt-2 text-red-700" role="alert">{{ validation() }}</p>
      }
      @if (state().error) {
        <p class="mt-2 text-red-700" role="alert">{{ state().error }}</p>
      }
      @if (state().message) {
        <p class="mt-2 text-primary" role="status">{{ state().message }}</p>
      }
      @if (state().busy) {
        <p class="mt-2 text-muted" role="status">Working…</p>
      }
      @for (source of state().sources; track source.id) {
        <article class="mt-4 rounded-lg border border-line p-4">
          <h3 class="font-semibold">{{ source.name }}</h3>
          <p class="break-all text-sm text-muted">{{ source.url }}</p>
          <ul class="my-2 space-y-1 text-sm">
            @for (mapping of source.topics; track mapping.topic) {
              <li>
                {{ mapping.topic }}
                @if (mapping.keywords) {
                  <span class="text-muted">({{ mapping.keywords }})</span>
                }
              </li>
            }
          </ul>
          @if (source.lastSuccess) {
            <p class="text-sm">Last successful run: {{ source.lastSuccess | date: 'short' }}</p>
          }
          @if (source.status) {
            <p class="text-sm">{{ source.status }}</p>
          }
          <div class="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              class="rounded border border-line px-3 py-1.5 text-primary"
              (click)="select(source)"
            >
              Add or update topic
            </button>
            <button
              type="button"
              class="rounded border border-line px-3 py-1.5 text-primary"
              [disabled]="state().busy"
              (click)="run(source.id)"
            >
              Run now
            </button>
          </div>
        </article>
      }
    </section>
  `,
})
export class NewsSources {
  private readonly store: Store = inject(Store);
  protected readonly SourceKind: typeof SourceKind = SourceKind;
  protected readonly state: Signal<SourcesState> = this.store.selectSignal(selectSources);
  protected readonly validation: WritableSignal<string> = signal('');
  private readonly model: WritableSignal<SourceInput> = signal({
    name: '',
    url: '',
    kind: SourceKind.Rss,
    topic: '',
    keywords: '',
  });
  protected readonly fields: FieldTree<SourceInput> = form(this.model, (path) => {
    required(path.name);
    required(path.url);
    required(path.topic);
    maxLength(path.name, 100);
    maxLength(path.keywords, 300);
  });
  constructor() {
    this.store.dispatch(sourcesActions.load());
  }
  protected select(source: NewsSource): void {
    this.model.set({
      name: source.name,
      url: source.url,
      kind: source.kind,
      topic: '',
      keywords: '',
    });
  }
  protected save(event: SubmitEvent): void {
    event.preventDefault();
    if (this.state().busy) return;
    if (this.fields().invalid() || !this.model().url.trim().startsWith('https://')) {
      this.validation.set('Enter a source name, an HTTPS URL and a topic.');
      return;
    }
    this.validation.set('');
    this.store.dispatch(sourcesActions.save({ source: this.model() }));
  }
  protected run(id: number): void {
    this.store.dispatch(sourcesActions.run({ id }));
  }
}
