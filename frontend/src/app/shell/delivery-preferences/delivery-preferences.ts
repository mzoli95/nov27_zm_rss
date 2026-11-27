import { Component, Signal, WritableSignal, computed, effect, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { ChannelPreference, deliveryActions } from '../+state/delivery.actions';
import type { DeliverySettings } from '../+state/delivery.reducer';
import { selectDeliveryPreferences } from '../+state/delivery.selectors';

@Component({
  selector: 'app-delivery-preferences',
  templateUrl: './delivery-preferences.html',
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
