import { Component, Signal, WritableSignal, computed, effect, inject, signal } from '@angular/core';
import { FieldTree, FormField, form } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { Auth } from '../auth/auth';
import { profileActions, ProfilePreferences } from './+state/profile.actions';
import type { ProfileState } from './+state/profile.reducer';
import { selectProfile } from './+state/profile.selectors';
import { DeliveryPreferences } from './delivery-preferences';

interface PreferenceFields {
  labels: string;
}

@Component({
  imports: [FormField, RouterLink, DeliveryPreferences],
  host: { class: 'mx-auto block max-w-3xl' },
  template: `
    <h1 class="text-3xl font-bold">Profile</h1>
    <p class="mt-2 text-muted">{{ email() }}</p>
    <section class="mt-6 rounded-2xl border border-line bg-white p-5 sm:p-7">
      <h2 class="text-xl font-semibold">Alert preferences</h2>
      <p class="mt-2 text-sm text-muted">
        Choose topics and add labels to narrow matching headlines and summaries.
      </p>
      @if (state().error) {
        <p class="mt-4 text-red-700" role="alert">{{ state().error }}</p>
      }
      @if (state().message) {
        <p class="mt-4 text-primary" role="status">{{ state().message }}</p>
      }
      @if (state().profile; as profile) {
        <form class="mt-5 grid gap-5" (submit)="save($event)">
          <fieldset class="grid gap-3 sm:grid-cols-2">
            <legend class="mb-2 font-medium">Topics</legend>
            @for (topic of profile.availableTopics; track topic) {
              <label class="flex items-center gap-2 rounded-lg border border-line p-3">
                <input
                  type="checkbox"
                  class="accent-primary"
                  [checked]="topics().includes(topic)"
                  (change)="toggleTopic(topic, $event)"
                />
                {{ topic }}
              </label>
            }
          </fieldset>
          <div>
            <label for="preference-labels" class="font-medium">Custom labels</label>
            <input
              id="preference-labels"
              [formField]="fields.labels"
              placeholder="e.g. bitcoin, space travel"
              aria-describedby="label-help"
            />
            <p id="label-help" class="mt-1 text-sm text-muted">
              Separate labels with commas. Use up to 20 labels, 60 characters each.
            </p>
          </div>
          @if (validation()) {
            <p class="text-red-700" role="alert">{{ validation() }}</p>
          }
          <div class="flex flex-wrap items-center gap-4">
            <button class="primary" [disabled]="state().pending">Save preferences</button>
            <a
              routerLink="/"
              [queryParams]="{ preferred: true }"
              class="font-medium text-primary hover:underline"
              >View matching news</a
            >
          </div>
        </form>
      } @else if (state().pending) {
        <p class="mt-4 text-muted" role="status">Loading preferences…</p>
      } @else {
        <button type="button" class="primary mt-4" (click)="load()">Retry</button>
      }
    </section>
    <app-delivery-preferences />
  `,
})
export class Profile {
  private readonly store: Store = inject(Store);
  protected readonly email: Signal<string> = inject(Auth).email;
  protected readonly state: Signal<ProfileState> = this.store.selectSignal(selectProfile);
  private readonly savedProfile: Signal<ProfilePreferences | null> = computed(
    () => this.state().profile,
  );
  protected readonly topics: WritableSignal<string[]> = signal([]);
  protected readonly validation: WritableSignal<string> = signal('');
  private readonly model: WritableSignal<PreferenceFields> = signal({ labels: '' });
  protected readonly fields: FieldTree<PreferenceFields> = form(this.model);
  constructor() {
    this.load();
    effect(() => {
      const profile: ProfilePreferences | null = this.savedProfile();
      if (profile) {
        this.topics.set(profile.topics);
        this.model.set({ labels: profile.labels.join(', ') });
      }
    });
  }
  protected load(): void {
    this.store.dispatch(profileActions.load());
  }
  protected toggleTopic(topic: string, event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) return;
    const checked: boolean = event.target.checked;
    this.topics.update((items) =>
      checked ? [...items, topic] : items.filter((item) => item !== topic),
    );
  }
  protected save(event: SubmitEvent): void {
    event.preventDefault();
    if (this.state().pending) return;
    const labels: string[] = this.model()
      .labels.split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (labels.length > 20 || labels.some((label) => label.length > 60)) {
      this.validation.set('Use up to 20 labels of 60 characters each.');
      return;
    }
    this.validation.set('');
    this.store.dispatch(profileActions.save({ preferences: { topics: this.topics(), labels } }));
  }
}
