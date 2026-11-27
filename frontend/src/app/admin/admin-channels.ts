import { DatePipe } from '@angular/common';
import { Component, Signal, WritableSignal, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { ChannelOverview, ChannelSetting, deliveryActions } from '../shell/+state/delivery.actions';
import type { DeliverySettings } from '../shell/+state/delivery.reducer';
import { selectDeliveryAdmin } from '../shell/+state/delivery.selectors';
import { ProviderConfigEditor } from './provider-config';

@Component({
  selector: 'app-admin-channels',
  imports: [DatePipe, ProviderConfigEditor],
  template: ` <section class="rounded-2xl border border-line bg-white p-5 sm:p-7">
    <h2 class="text-xl font-semibold">Delivery channels</h2>
    @if (state().error) {
      <p class="mt-3 text-red-700" role="alert">{{ state().error }}</p>
    }
    @if (state().message) {
      <p class="mt-3" role="status">{{ state().message }}</p>
    }
    @if (state().busy) {
      <p class="mt-3" role="status">Loading channels…</p>
    }
    @for (channel of state().data.channels; track channel.channel) {
      <div
        class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-3"
      >
        <div>
          <p class="font-medium">{{ channel.channel }}</p>
          <p class="text-sm text-muted">
            {{
              channel.configured
                ? channel.enabled
                  ? 'Enabled'
                  : 'Disabled'
                : 'Provider configuration required'
            }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          @if (channel.canConfigure) {
            <button
              type="button"
              class="rounded-md border border-line px-3 py-1.5 text-primary"
              (click)="editing.set(channel.channel)"
            >
              Configure
            </button>
          }
          <button
            type="button"
            class="rounded-md border border-line px-3 py-1.5 text-primary"
            [disabled]="!channel.configured || state().busy"
            (click)="toggle(channel)"
          >
            {{ channel.enabled ? 'Disable' : 'Enable' }}
          </button>
        </div>
      </div>
      @if (editing() === channel.channel) {
        <app-provider-config
          [channel]="channel.channel"
          (saved)="providerSaved()"
          (cancelled)="editing.set(null)"
        />
      }
    }
    <div class="mt-6 flex flex-wrap items-center justify-between gap-2">
      <h3 class="font-semibold">Recent delivery attempts</h3>
      <button
        type="button"
        class="text-primary underline"
        [disabled]="state().busy"
        (click)="load()"
      >
        Refresh
      </button>
    </div>
    <ul class="mt-3 divide-y divide-line">
      @for (attempt of state().data.recent; track $index) {
        <li class="flex flex-wrap justify-between gap-2 py-2 text-sm">
          <span class="font-medium">{{ attempt.channel }} · {{ attempt.status }}</span>
          <span class="text-muted"
            >Article #{{ attempt.articleId }} · {{ attempt.updatedAt | date: 'short' }}</span
          >
        </li>
      } @empty {
        <li class="text-sm text-muted">No delivery attempts yet.</li>
      }
    </ul>
  </section>`,
})
export class AdminChannels {
  protected readonly editing: WritableSignal<string | null> = signal(null);
  private readonly store: Store = inject(Store);
  protected readonly state: Signal<DeliverySettings<ChannelOverview>> =
    this.store.selectSignal(selectDeliveryAdmin);
  constructor() {
    this.load();
  }
  protected load(): void {
    this.store.dispatch(deliveryActions.loadChannels());
  }
  protected providerSaved(): void {
    this.editing.set(null);
    this.load();
  }
  protected toggle(channel: ChannelSetting): void {
    this.store.dispatch(
      deliveryActions.changeChannel({ channel: channel.channel, enabled: !channel.enabled }),
    );
  }
}
