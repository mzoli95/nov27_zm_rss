import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, Signal, WritableSignal, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Store } from '@ngrx/store';
import { finalize } from 'rxjs';
import { ChannelOverview, ChannelSetting, deliveryActions } from '../../shell/+state/delivery.actions';
import type { DeliverySettings } from '../../shell/+state/delivery.reducer';
import { selectDeliveryAdmin } from '../../shell/+state/delivery.selectors';
import { ProviderConfigEditor } from '../provider-config/provider-config';

enum TestDeliveryStatus {
  Accepted = 'Accepted',
  Ambiguous = 'Ambiguous',
}

@Component({
  selector: 'app-admin-channels',
  imports: [DatePipe, MatSnackBarModule, ProviderConfigEditor],
  templateUrl: './admin-channels.html',
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
