import { Component, Signal, WritableSignal, computed, inject, signal } from '@angular/core';
import { FieldTree, FormField, email, form, minLength, required } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Auth, AuthMode } from './auth';

interface AuthFields {
  email: string;
  password: string;
  accepted: boolean;
}

@Component({
  imports: [FormField, RouterLink],
  template: `
    <section class="mx-auto max-w-md rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-9">
      <h1 class="text-3xl font-bold">{{ title() }}</h1>
      @if (!configured()) {
        <p class="mt-3 text-muted">Supabase configuration is required to use this form.</p>
      }
      <form class="mt-6 grid gap-4" (submit)="submit($event)">
        @if (mode !== AuthMode.Update) {
          <label>Email<input type="email" autocomplete="email" [formField]="fields.email" /></label>
        }
        @if (mode !== AuthMode.Forgot) {
          <label
            >{{ mode === AuthMode.Update ? 'New password' : 'Password' }}
            <input
              type="password"
              [autocomplete]="mode === AuthMode.Login ? 'current-password' : 'new-password'"
              [formField]="fields.password"
            />
          </label>
        }
        @if (mode === AuthMode.Register) {
          <p class="text-sm text-muted">
            We use your email to manage your account and deliver the alerts you enable.
          </p>
          <label class="flex items-start gap-2 text-sm">
            <input class="mt-1 accent-primary" type="checkbox" [formField]="fields.accepted" />
            I acknowledge the privacy notice above.
          </label>
        }
        @if (feedback()) {
          <p class="text-sm text-muted" role="status">{{ feedback() }}</p>
        }
        <button class="primary" [disabled]="busy() || !configured() || fields().invalid()">
          {{ busy() ? 'Please wait…' : title() }}
        </button>
      </form>
      <nav class="mt-5 flex flex-wrap gap-4 text-sm text-primary">
        @if (mode !== AuthMode.Login) {
          <a routerLink="/login">Sign in</a>
        }
        @if (mode === AuthMode.Login) {
          <a routerLink="/register">Create an account</a
          ><a routerLink="/forgot-password">Forgot password?</a>
        }
      </nav>
    </section>
  `,
})
export class AuthPage {
  private readonly auth: Auth = inject(Auth);
  private readonly router: Router = inject(Router);
  protected readonly AuthMode: typeof AuthMode = AuthMode;
  protected readonly mode: AuthMode = inject(ActivatedRoute).snapshot.data['mode'] as AuthMode;
  protected readonly configured: Signal<boolean> = this.auth.configured;
  protected readonly title: Signal<string> = computed(
    () =>
      ({
        login: 'Sign in',
        register: 'Create an account',
        forgot: 'Send reset link',
        update: 'Update password',
      })[this.mode],
  );
  private readonly model: WritableSignal<AuthFields> = signal({
    email: '',
    password: '',
    accepted: false,
  });
  protected readonly fields: FieldTree<AuthFields> = form(this.model, (path) => {
    if (this.mode !== AuthMode.Update) {
      required(path.email);
      email(path.email);
    }
    if (this.mode !== AuthMode.Forgot) required(path.password);
    if (this.mode === AuthMode.Register || this.mode === AuthMode.Update)
      minLength(path.password, 8);
    if (this.mode === AuthMode.Register) required(path.accepted);
  });
  protected readonly busy: WritableSignal<boolean> = signal(false);
  protected readonly feedback: WritableSignal<string> = signal('');

  protected async submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!this.configured() || this.busy() || this.fields().invalid()) return;
    this.busy.set(true);
    this.feedback.set('');
    try {
      const message: string | null = await this.auth.submit(this.mode, {
        email: this.model().email.trim(),
        password: this.model().password,
      });
      if (message === null) await this.router.navigateByUrl('/');
      else this.feedback.set(message);
    } catch {
      this.feedback.set('The request could not be completed. Please try again.');
    } finally {
      this.busy.set(false);
    }
  }
}
