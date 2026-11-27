import { HttpClient, HttpErrorResponse, httpResource } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  InputSignal,
  OutputEmitterRef,
  Signal,
  WritableSignal,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

enum ProviderFieldType {
  Password = 'password',
  Tls = 'tls',
}
interface ProviderField {
  key: string;
  label: string;
  type: string;
}
interface ProviderConfig {
  fields: ProviderField[];
  values: Record<string, string>;
  hasSecret: boolean;
}

@Component({
  selector: 'app-provider-config',
  template: `
    <form
      class="mt-3 grid gap-3 rounded-lg border border-line bg-page p-4 sm:grid-cols-2"
      (submit)="save($event)"
    >
      <h3 class="font-semibold sm:col-span-2">Configure {{ channel() }}</h3>
      @if (configuration.isLoading()) {
        <p role="status">Loading provider settings…</p>
      }
      @if (configuration.error()) {
        <p role="alert" class="text-red-700 sm:col-span-2">Could not load provider settings.</p>
      }
      @if (config(); as settings) {
        @for (field of settings.fields; track field.key) {
          <div>
            <label [for]="'provider-' + field.key">{{ field.label }}</label>
            @if (field.type === FieldType.Tls) {
              <select
                [id]="'provider-' + field.key"
                [value]="values()[field.key]"
                (change)="update(field.key, $event)"
              >
                <option value="StartTls">STARTTLS</option>
                <option value="SslOnConnect">Implicit TLS</option>
              </select>
            } @else {
              <input
                [id]="'provider-' + field.key"
                [type]="field.type"
                [value]="values()[field.key] ?? ''"
                [attr.autocomplete]="field.type === FieldType.Password ? 'new-password' : null"
                [placeholder]="
                  field.type === FieldType.Password && settings.hasSecret
                    ? 'Saved. Leave blank to keep.'
                    : ''
                "
                (input)="update(field.key, $event)"
              />
            }
          </div>
        }
      }
      @if (error()) {
        <p role="alert" class="text-red-700 sm:col-span-2">{{ error() }}</p>
      }
      <div class="flex gap-3 sm:col-span-2">
        <button class="primary" [disabled]="!config() || saving()">Save provider settings</button>
        <button
          type="button"
          (click)="cancelled.emit()"
          class="rounded-md border border-line px-3 py-2"
        >
          Cancel
        </button>
      </div>
    </form>
  `,
})
export class ProviderConfigEditor {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly destroy: DestroyRef = inject(DestroyRef);
  readonly channel: InputSignal<string> = input.required<string>();
  readonly saved: OutputEmitterRef<void> = output();
  readonly cancelled: OutputEmitterRef<void> = output();
  protected readonly FieldType: typeof ProviderFieldType = ProviderFieldType;
  private readonly endpoint: Signal<string> = computed(
    () => '/api/admin/channels/' + encodeURIComponent(this.channel()) + '/config',
  );
  protected readonly configuration = httpResource<ProviderConfig>(() => this.endpoint());
  protected readonly config: Signal<ProviderConfig | undefined> = computed(() =>
    this.configuration.hasValue() ? this.configuration.value() : undefined,
  );
  protected readonly values: WritableSignal<Record<string, string>> = signal({});
  protected readonly saving: WritableSignal<boolean> = signal(false);
  protected readonly error: WritableSignal<string> = signal('');

  constructor() {
    effect(() => {
      this.values.set(this.config()?.values ?? {});
    });
  }

  protected update(key: string, event: Event): void {
    if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement))
      return;
    const value: string = event.target.value;
    this.values.update((values) => ({ ...values, [key]: value }));
  }

  protected save(event: SubmitEvent): void {
    event.preventDefault();
    if (!this.config() || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.http
      .put<void>(this.endpoint(), { values: this.values() })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.values.set({});
          this.saving.set(false);
          this.saved.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.error.set(error.error?.message ?? 'Could not save provider settings.');
          this.saving.set(false);
        },
      });
  }
}
