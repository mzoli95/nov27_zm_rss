import { DatePipe } from '@angular/common';
import {
  Component,
  ElementRef,
  Signal,
  WritableSignal,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FieldTree, FormField, form, maxLength, required } from '@angular/forms/signals';
import { Store } from '@ngrx/store';
import {
  NewsSource,
  SourceInput,
  SourceKind,
  SourceTopic,
  sourcesActions,
} from './+state/sources.actions';
import type { SourcesState } from './+state/sources.reducer';
import { selectSources } from './+state/sources.selectors';

type SourceFields = Omit<SourceInput, 'topics'>;
const empty: SourceFields = { name: '', url: '', kind: SourceKind.Rss };

@Component({
  selector: 'app-news-sources',
  imports: [DatePipe, FormField],
  templateUrl: './news-sources.html',
})
export class NewsSources {
  private readonly store: Store = inject(Store);
  private readonly dialog: Signal<ElementRef<HTMLDialogElement> | undefined> = viewChild('editor');
  protected readonly SourceKind: typeof SourceKind = SourceKind;
  protected readonly state: Signal<SourcesState> = this.store.selectSignal(selectSources);
  protected readonly validation: WritableSignal<string> = signal('');
  protected readonly editing: WritableSignal<boolean> = signal(false);
  protected readonly sourceId: WritableSignal<number | null> = signal(null);
  protected readonly topics: WritableSignal<SourceTopic[]> = signal([]);
  private readonly model: WritableSignal<SourceFields> = signal(empty);
  protected readonly fields: FieldTree<SourceFields> = form(this.model, (path) => {
    required(path.name);
    required(path.url);
    maxLength(path.name, 100);
  });

  constructor() {
    this.load(1);
    effect(() => {
      if (this.state().saved) this.close();
    });
  }

  protected open(source?: NewsSource): void {
    this.store.dispatch(sourcesActions.editorOpened());
    this.model.set(source ? { name: source.name, url: source.url, kind: source.kind } : empty);
    this.topics.set(source?.topics ?? []);
    this.sourceId.set(source?.id ?? null);
    this.validation.set('');
    this.editing.set(true);
    this.dialog()?.nativeElement.showModal();
  }

  protected close(): void {
    this.dialog()?.nativeElement.close();
    this.editing.set(false);
  }

  protected toggleTopic(topic: string, event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) return;
    const checked: boolean = event.target.checked;
    this.topics.update((items) =>
      checked ? [...items, { topic, keywords: '' }] : items.filter((item) => item.topic !== topic),
    );
  }

  protected setKeywords(topic: string, event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) return;
    const keywords: string = event.target.value;
    this.topics.update((items) =>
      items.map((item) => (item.topic === topic ? { ...item, keywords } : item)),
    );
  }

  protected selected(topic: string): SourceTopic | undefined {
    return this.topics().find((item) => item.topic === topic);
  }

  protected save(event: SubmitEvent): void {
    event.preventDefault();
    const source: SourceInput | undefined = this.input();
    if (source)
      this.store.dispatch(
        sourcesActions.save({ source, id: this.sourceId(), page: this.state().sources.page }),
      );
  }

  protected test(): void {
    const source: SourceInput | undefined = this.input();
    if (source) this.store.dispatch(sourcesActions.test({ source }));
  }

  protected load(page: number): void {
    this.store.dispatch(sourcesActions.load({ page }));
  }
  protected run(id: number): void {
    this.store.dispatch(sourcesActions.run({ id, page: this.state().sources.page }));
  }

  protected remove(source: NewsSource): void {
    if (window.confirm('Delete ' + source.name + '? Previously imported articles will remain.'))
      this.store.dispatch(
        sourcesActions.delete({ id: source.id, page: this.state().sources.page }),
      );
  }

  private input(): SourceInput | undefined {
    if (this.state().busy) return undefined;
    if (
      this.fields().invalid() ||
      !this.model().url.trim().startsWith('https://') ||
      !this.topics().length
    ) {
      this.validation.set('Enter a source name, an HTTPS URL and at least one topic.');
      return undefined;
    }
    this.validation.set('');
    return { ...this.model(), url: this.model().url.trim(), topics: this.topics() };
  }
}
