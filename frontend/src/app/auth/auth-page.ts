import { Component, Signal, WritableSignal, computed, inject, signal } from '@angular/core';
import { FieldTree, FormField, form, minLength, pattern, required } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Auth, AuthMode, CONFIRMATION_REQUIRED } from './auth';

interface AuthFields {
  email: string;
  password: string;
  accepted: boolean;
}

const MINIMUM_PASSWORD_LENGTH: number = 6;
const EMAIL_FORMAT: RegExp = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

@Component({
  imports: [FormField, RouterLink],
  template: `
    <section class="mx-auto max-w-md rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-9">
      @if (confirmationEmail(); as email) {
        <div role="status">
          <h1 class="text-3xl font-bold">Check your email</h1>
          <p class="mt-3 text-muted">
            We sent a confirmation link to <strong class="break-all text-ink">{{ email }}</strong>.
            Open the link to confirm your account, then return to the home page.
          </p>
        </div>
        <a class="primary mt-6 inline-flex" routerLink="/">Back to home</a>
      } @else {
        <h1 class="text-3xl font-bold">{{ title() }}</h1>
        @if (!configured()) {
          <p class="mt-3 text-muted">Supabase configuration is required to use this form.</p>
        }
        <form novalidate class="mt-6 grid gap-4" (submit)="submit($event)">
          @if (mode !== AuthMode.Update) {
            <div>
              <label for="auth-email">Email</label>
              <input
                id="auth-email"
                type="email"
                autocomplete="email"
                [formField]="fields.email"
                [attr.aria-invalid]="emailError() ? true : null"
                [attr.aria-describedby]="emailError() ? 'email-error' : null"
              />
              @if (emailError(); as error) {
                <p id="email-error" class="mt-1 text-sm text-red-700">{{ error }}</p>
              }
            </div>
          }
          @if (mode !== AuthMode.Forgot) {
            <div>
              <label for="auth-password">{{
                mode === AuthMode.Update ? 'New password' : 'Password'
              }}</label>
              <div class="relative">
                <input
                  id="auth-password"
                  [type]="passwordVisible() ? 'text' : 'password'"
                  class="password-input"
                  [autocomplete]="mode === AuthMode.Login ? 'current-password' : 'new-password'"
                  [formField]="fields.password"
                  [attr.aria-invalid]="passwordError() ? true : null"
                  [attr.aria-describedby]="passwordError() ? 'password-error' : null"
                />
                <button
                  type="button"
                  class="absolute inset-y-0 right-1 my-1 grid aspect-square place-items-center rounded-md text-muted hover:bg-tint hover:text-primary"
                  (click)="togglePassword()"
                  [attr.aria-label]="passwordVisible() ? 'Hide password' : 'Show password'"
                >
                  <span
                    class="bi block text-lg leading-none"
                    [class.bi-eye]="!passwordVisible()"
                    [class.bi-eye-slash]="passwordVisible()"
                    aria-hidden="true"
                  ></span>
                </button>
              </div>
              @if (passwordError(); as error) {
                <p id="password-error" class="mt-1 text-sm text-red-700">{{ error }}</p>
              }
            </div>
          }
          @if (mode === AuthMode.Register) {
            <p class="text-sm text-muted">
              We use your email to manage your account and deliver the alerts you enable.
            </p>
            <label class="flex items-start gap-2 text-sm">
              <input
                class="mt-1 accent-primary"
                type="checkbox"
                [formField]="fields.accepted"
                [attr.aria-invalid]="privacyError() ? true : null"
                [attr.aria-describedby]="privacyError() ? 'privacy-error' : null"
              />
              I acknowledge the privacy notice above.
            </label>
            @if (privacyError(); as error) {
              <p id="privacy-error" class="text-sm text-red-700">{{ error }}</p>
            }
          }
          @if (feedback()) {
            <p class="text-sm text-muted" role="status">{{ feedback() }}</p>
          }
          <button class="primary" [disabled]="busy() || !configured()">
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
      }
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
      required(path.email, { message: 'Enter your email address.' });
      pattern(path.email, EMAIL_FORMAT, { message: 'Enter a valid email address.' });
    }
    if (this.mode !== AuthMode.Forgot) {
      required(path.password, { message: 'Enter your password.' });
      minLength(path.password, MINIMUM_PASSWORD_LENGTH, {
        message: 'Use at least six characters.',
      });
    }
    if (this.mode === AuthMode.Register)
      required(path.accepted, { message: 'Acknowledge the privacy notice to continue.' });
  });
  protected readonly busy: WritableSignal<boolean> = signal(false);
  protected readonly feedback: WritableSignal<string> = signal('');
  protected readonly confirmationEmail: WritableSignal<string> = signal('');
  protected readonly passwordVisible: WritableSignal<boolean> = signal(false);
  private readonly submitted: WritableSignal<boolean> = signal(false);
  protected readonly emailError: Signal<string | undefined> = this.fieldError(this.fields.email);
  protected readonly passwordError: Signal<string | undefined> = this.fieldError(
    this.fields.password,
  );
  protected readonly privacyError: Signal<string | undefined> = this.fieldError(
    this.fields.accepted,
  );

  protected togglePassword(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  protected async submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    this.submitted.set(true);
    this.feedback.set('');
    if (!this.configured() || this.busy() || this.fields().invalid()) return;
    this.busy.set(true);
    try {
      const email: string = this.model().email.trim();
      const message: string | typeof CONFIRMATION_REQUIRED | null = await this.auth.submit(
        this.mode,
        {
          email,
          password: this.model().password,
        },
      );
      if (message === CONFIRMATION_REQUIRED) {
        this.model.set({ email: '', password: '', accepted: false });
        this.confirmationEmail.set(email);
      } else if (message === null) await this.router.navigateByUrl('/');
      else this.feedback.set(message);
    } catch {
      this.feedback.set('The request could not be completed. Please try again.');
    } finally {
      this.busy.set(false);
    }
  }

  private fieldError<T>(field: FieldTree<T>): Signal<string | undefined> {
    return computed(() =>
      this.submitted() || field().touched() ? field().errors()[0]?.message : undefined,
    );
  }
}
