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
  templateUrl: './profile.html',
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
