import { HttpClient } from '@angular/common/http';
import { Component, Signal, WritableSignal, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Auth } from '../../auth/auth';

@Component({
  selector: 'app-account-archive',
  templateUrl: './account-archive.html',
})
export class AccountArchive {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly auth: Auth = inject(Auth);
  private readonly router: Router = inject(Router);
  protected readonly email: Signal<string> = this.auth.email;
  protected readonly confirming: WritableSignal<boolean> = signal(false);
  protected readonly busy: WritableSignal<boolean> = signal(false);
  protected readonly error: WritableSignal<string> = signal('');

  protected async archive(): Promise<void> {
    if (!this.confirming() || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await firstValueFrom(this.http.post<void>('/api/account/archive', {}));
    } catch {
      this.error.set('Could not archive your account. Please try again.');
      this.busy.set(false);
      return;
    }
    try {
      await this.auth.client()?.auth.signOut({ scope: 'local' });
    } finally {
      this.auth.session.set(null);
      await this.router.navigateByUrl('/login');
      this.busy.set(false);
    }
  }
}
