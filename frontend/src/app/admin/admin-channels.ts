import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, Signal, WritableSignal, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Store } from '@ngrx/store';
import { finalize } from 'rxjs';
import { ChannelOverview, ChannelSetting, deliveryActions } from '../shell/+state/delivery.actions';
import type { DeliverySettings } from '../shell/+state/delivery.reducer';
import { selectDeliveryAdmin } from '../shell/+state/delivery.selectors';
import { ProviderConfigEditor } from './provider-config';

enum TestDeliveryStatus {
  Accepted = 'Accepted',
  Ambiguous = 'Ambiguous',
}

@Component({
  selector: 'app-admin-channels',
  imports: [DatePipe, MatSnackBarModule, ProviderConfigEditor],
  template: ` <section class="rounded-2xl border border-line bg-white p-5 sm:p-7">
    <h2 class="text-xl font-semibold">Delivery channels</h2>
    <p class="mt-2 text-sm text-muted">
      Test messages use the saved template and your verified account email to find the destination.
    </p>
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
              channel.prepared
                ? 'Configuration available · delivery pending'
                : channel.configured
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
          @if (channel.configured) {
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-md border border-line px-3 py-1.5 text-primary"
              [disabled]="testing() !== null"
              [attr.aria-busy]="testing() === channel.channel"
              (click)="sendTest(channel.channel)"
            >
              @if (testing() === channel.channel) {
                <span
                  class="size-4 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin"
                  aria-hidden="true"
                ></span>
              }
              {{ testing() === channel.channel ? 'Sending…' : 'Send test' }}
            </button>
            @if (testing() === channel.channel) {
              <span class="sr-only" role="status"
                >Sending a {{ channel.channel }} test message.</span
              >
            }
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
  private readonly http: HttpClient = inject(HttpClient);
  private readonly destroy: DestroyRef = inject(DestroyRef);
  private readonly snackBar: MatSnackBar = inject(MatSnackBar);
  protected readonly testing: WritableSignal<string | null> = signal(null);
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
    this.notify('Provider settings saved.');
    this.load();
  }
  protected sendTest(channel: string): void {
    if (this.testing() !== null) return;
    this.testing.set(channel);
    this.http
      .post<{ status: TestDeliveryStatus; detail?: string }>(
        '/api/admin/channels/' + encodeURIComponent(channel) + '/test',
        {},
      )
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.testing.set(null)),
      )
      .subscribe({
        next: ({ status, detail }) => {
          switch (status) {
            case TestDeliveryStatus.Accepted:
              this.notify(`Test message sent via ${channel}.`);
              break;
            case TestDeliveryStatus.Ambiguous:
              this.notify(
                `${channel} delivery could not be confirmed. Check your inbox before retrying.`,
              );
              break;
            default:
              this.notify(detail ?? `The ${channel} test message could not be sent.`);
          }
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 0) {
            this.notify('Could not reach the local app. Check that it is running and try again.');
            return;
          }
          this.notify(error.error?.message ?? error.error?.detail ?? 'Could not send the test.');
        },
      });
  }
  private notify(message: string): void {
    this.snackBar.open(message, 'Dismiss', {
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
      duration: 7000,
    });
  }
  protected toggle(channel: ChannelSetting): void {
    this.store.dispatch(
      deliveryActions.changeChannel({ channel: channel.channel, enabled: !channel.enabled }),
    );
  }
}
