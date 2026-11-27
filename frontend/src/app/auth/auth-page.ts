import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Auth, PRIVACY_VERSION } from './auth';
import type { SupabaseClient } from '@supabase/supabase-js';

@Component({
  imports: [FormsModule, RouterLink],
  template: `
    <section class="mx-auto max-w-md rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-9">
      <h1 class="text-3xl font-bold">{{ title() }}</h1>
      @if (!auth.client()) { <p class="mt-3 text-muted">Supabase configuration is required to use this form.</p> }
      <form #form="ngForm" class="mt-6 grid gap-4" (ngSubmit)="form.valid && submit()">
        @if (mode !== 'update') {
          <label>Email<input name="email" type="email" autocomplete="email" required email [(ngModel)]="email"></label>
        }
        @if (mode !== 'forgot') {
          <label>{{ mode === 'update' ? 'New password' : 'Password' }}
            <input name="password" type="password" [minlength]="mode === 'login' ? 1 : 8"
              [autocomplete]="mode === 'login' ? 'current-password' : 'new-password'" required [(ngModel)]="password">
          </label>
        }
        @if (mode === 'register') {
          <p class="text-sm text-muted">We use your email to manage your account and deliver the alerts you enable.</p>
          <label class="flex items-start gap-2 text-sm">
            <input class="mt-1 accent-primary" name="privacy" type="checkbox" required [(ngModel)]="accepted">
            I acknowledge the privacy notice above.
          </label>
        }
        @if (feedback()) { <p class="text-sm text-muted" role="status">{{ feedback() }}</p> }
        <button class="primary" [disabled]="busy() || !auth.client() || !form.valid">{{ busy() ? 'Please wait…' : title() }}</button>
      </form>
      <nav class="mt-5 flex flex-wrap gap-4 text-sm text-primary">
        @if (mode !== 'login') { <a routerLink="/login">Sign in</a> }
        @if (mode === 'login') {
          <a routerLink="/register">Create an account</a><a routerLink="/forgot-password">Forgot password?</a>
        }
      </nav>
    </section>
  `,
})
export class AuthPage {
  protected readonly auth = inject(Auth);
  private readonly router = inject(Router);
  protected readonly mode = inject(ActivatedRoute).snapshot.data['mode'] as 'login' | 'register' | 'forgot' | 'update';
  protected readonly title = computed(() => ({
    login: 'Sign in', register: 'Create an account', forgot: 'Send reset link', update: 'Update password',
  })[this.mode]);
  protected email = '';
  protected password = '';
  protected accepted = false;
  protected readonly busy = signal(false);
  protected readonly feedback = signal('');

  protected async submit() {
    const client = this.auth.client();
    if (!client || this.busy() || (this.mode === 'register' && !this.accepted)) return;
    this.busy.set(true);
    this.feedback.set('');
    try {
      await this.perform(client);
    } catch {
      this.feedback.set('The request could not be completed. Please try again.');
    } finally {
      this.busy.set(false);
    }
  }

  private async perform(client: SupabaseClient) {
    const credentials = { email: this.email.trim(), password: this.password };
    switch (this.mode) {
      case 'register': {
        const { data, error } = await client.auth.signUp({
          ...credentials,
          options: { emailRedirectTo: location.origin + '/', data: {
            privacy_notice_version: PRIVACY_VERSION, privacy_acknowledged_at: new Date().toISOString(),
          } },
        });
        if (error) this.feedback.set(error.message);
        else if (data.session) await this.router.navigateByUrl('/');
        else this.feedback.set('Check your email for a confirmation link.');
        break;
      }
      case 'forgot': {
        const { error } = await client.auth.resetPasswordForEmail(credentials.email, {
          redirectTo: location.origin + '/update-password',
        });
        this.feedback.set(error?.message ?? 'If an account exists, you will receive a reset link.');
        break;
      }
      case 'update': {
        await this.auth.ready;
        if (!this.auth.recovery()) {
          this.feedback.set('Open a valid password reset link to continue.');
          break;
        }
        const { error } = await client.auth.updateUser({ password: this.password });
        if (error) this.feedback.set(error.message);
        else {
          this.auth.recovery.set(false);
          await this.router.navigateByUrl('/');
        }
        break;
      }
      case 'login': {
        const { error } = await client.auth.signInWithPassword(credentials);
        if (error) this.feedback.set(error.message);
        else await this.router.navigateByUrl('/');
        break;
      }
    }
  }
}
