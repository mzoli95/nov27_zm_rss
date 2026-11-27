import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HttpInterceptorFn, HttpClient } from '@angular/common/http';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { catchError, map, of } from 'rxjs';

export interface AppConfig {
  supabaseUrl: string;
  supabasePublishableKey: string;
}
export const APP_CONFIG = new InjectionToken<AppConfig>('app configuration');
export const PRIVACY_VERSION = '2026-11-27';

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly config = inject(APP_CONFIG);
  readonly client = signal<SupabaseClient | null>(null);
  readonly session = signal<Session | null>(null);
  readonly recovery = signal(false);
  readonly ready = this.initialize().catch(() => this.session.set(null));

  private async initialize() {
    if (!this.config.supabaseUrl || !this.config.supabasePublishableKey) return;
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(this.config.supabaseUrl, this.config.supabasePublishableKey);
    client.auth.onAuthStateChange((event, session) => {
      this.session.set(session);
      if (event === 'PASSWORD_RECOVERY') this.recovery.set(true);
    });
    const { data } = await client.auth.getSession();
    this.session.set(data.session);
    this.client.set(client);
  }
}

export const signedIn: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);
  await auth.ready;
  return !!auth.session()?.user.email_confirmed_at || router.createUrlTree(['/login']);
};

export const adminOnly: CanActivateFn = () => {
  const http = inject(HttpClient);
  const router = inject(Router);
  return http.get('/api/admin/access').pipe(
    map(() => true),
    catchError(() => of(router.createUrlTree(['/']))),
  );
};

export const apiToken: HttpInterceptorFn = (request, next) => {
  const token = inject(Auth).session()?.access_token;
  const url = new URL(request.url, location.origin);
  return next(token && url.origin === location.origin && url.pathname.startsWith('/api/')
    ? request.clone({ setHeaders: { Authorization: 'Bearer ' + token } })
    : request);
};
