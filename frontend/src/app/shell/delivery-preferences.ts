import { Component, Signal, WritableSignal, computed, effect, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { ChannelPreference, deliveryActions } from './+state/delivery.actions';
import type { DeliverySettings } from './+state/delivery.reducer';
import { selectDeliveryPreferences } from './+state/delivery.selectors';

@Component({
  selector: 'app-delivery-preferences',
  template: ` <section class="mt-6 rounded-2xl border border-line bg-white p-5 sm:p-7">
    <h2 class="text-xl font-semibold">Delivery channels</h2>
    <p class="mt-2 text-sm text-muted">
      Email and Slack use your verified account email. Slack delivery requires that address in the
      configured workspace.
    </p>
    @if (state().error) {
      <p class="mt-3 text-red-700" role="alert">{{ state().error }}</p>
    }
    @if (state().message) {
      <p class="mt-3 text-primary" role="status">{{ state().message }}</p>
    }
    @if (state().busy && !options().length) {
      <p class="mt-3" role="status">Loading channels…</p>
    }
    @if (options().length) {
      <form class="mt-4 grid gap-3" (submit)="save($event)">
        @for (option of options(); track option.channel) {
          <label class="flex flex-wrap items-center gap-2">
            <input
              type="checkbox"
              class="accent-primary"
              [checked]="selected().includes(option.channel)"
              [disabled]="
                state().busy || (!option.available && !selected().includes(option.channel))
              "
              (change)="toggle(option.channel, $event)"
            />
            {{ option.channel }}
            @if (!option.available) {
              <span class="text-sm text-muted">Unavailable</span>
            }
          </label>
        }
        <button class="primary justify-self-start" [disabled]="state().busy || !canSave()">
          Save delivery preferences
        </button>
      </form>
    }
  </section>`,
})
export class DeliveryPreferences {
  private readonly store: Store = inject(Store);
  protected readonly state: Signal<DeliverySettings<ChannelPreference[]>> =
    this.store.selectSignal(selectDeliveryPreferences);
  protected readonly options: Signal<ChannelPreference[]> = computed(() => this.state().data);
  protected readonly canSave: Signal<boolean> = computed(() =>
    this.options().some((option) => option.available || option.selected),
  );
  protected readonly selected: WritableSignal<string[]> = signal([]);
  constructor() {
    this.store.dispatch(deliveryActions.loadPreferences());
    effect(() =>
      this.selected.set(
        this.options()
          .filter((item) => item.selected)
          .map((item) => item.channel),
      ),
    );
  }
  protected toggle(channel: string, event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) return;
    const enabled: boolean = event.target.checked;
    this.selected.update((channels) =>
      enabled ? [...channels, channel] : channels.filter((item) => item !== channel),
    );
  }
  protected save(event: SubmitEvent): void {
    event.preventDefault();
    if (!this.state().busy && this.canSave())
      this.store.dispatch(deliveryActions.savePreferences({ enabledChannels: this.selected() }));
  }
}
