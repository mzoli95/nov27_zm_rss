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
  templateUrl: './auth-page.html',
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
