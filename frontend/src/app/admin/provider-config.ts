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
  templateUrl: './provider-config.html',
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
