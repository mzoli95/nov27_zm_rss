import {
  Injectable,
  InjectionToken,
  Signal,
  WritableSignal,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HttpInterceptorFn, HttpClient } from '@angular/common/http';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  Observable,
  Subject,
  catchError,
  firstValueFrom,
  from,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';

export interface AppConfig {
  supabaseUrl: string;
  supabasePublishableKey: string;
}
export const APP_CONFIG = new InjectionToken<AppConfig>('app configuration');
export const PRIVACY_VERSION = '2026-11-27';
export const CONFIRMATION_REQUIRED: unique symbol = Symbol('confirmation required');
export enum AuthMode {
  Login = 'login',
  Register = 'register',
  Forgot = 'forgot',
  Update = 'update',
}
export enum AppRole {
  User = 'User',
  Admin = 'Admin',
}
export interface AuthCredentials {
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly adminRefresh: Subject<void> = new Subject<void>();
  private readonly config: AppConfig = inject(APP_CONFIG);
  readonly client: WritableSignal<SupabaseClient | null> = signal(null);
  readonly session: WritableSignal<Session | null> = signal(null);
  readonly recovery: WritableSignal<boolean> = signal(false);
  readonly configured: Signal<boolean> = computed(() => this.client() !== null);
  readonly signedIn: Signal<boolean> = computed(() => !!this.session()?.user.email_confirmed_at);
  readonly email: Signal<string> = computed(() => this.session()?.user.email ?? '');
  readonly userId: Signal<string | null> = computed(() => this.session()?.user.id ?? null);
  private readonly verifiedUserId: Signal<string | null> = computed(() =>
    this.signedIn() ? this.userId() : null,
  );
  readonly ready: Promise<void> = this.initialize().catch(() => this.session.set(null));
  readonly isAdmin: Signal<boolean> = toSignal(
    toObservable(this.verifiedUserId).pipe(
      switchMap((userId) => {
        if (!userId) return of(false);
        return this.adminRefresh.pipe(
          startWith(undefined),
          switchMap(() => from(this.ready).pipe(switchMap(() => this.checkAdmin()))),
          startWith(false),
        );
      }),
    ),
    { initialValue: false },
  );

  checkAdmin(): Observable<boolean> {
    if (!this.signedIn() || !this.session()?.access_token) return of(false);
    return this.http.get<{ isAdmin: boolean }>('/api/admin/access').pipe(
      map((access) => access.isAdmin),
      catchError(() => of(false)),
    );
  }

  refreshAdmin(): void {
    this.adminRefresh.next();
  }

  async submit(
    mode: AuthMode,
    credentials: AuthCredentials,
  ): Promise<string | typeof CONFIRMATION_REQUIRED | null> {
    const client: SupabaseClient | null = this.client();
    if (!client) return 'Supabase configuration is required.';

    switch (mode) {
      case AuthMode.Register: {
        const { data, error } = await client.auth.signUp({
          ...credentials,
          options: {
            emailRedirectTo: location.origin + '/',
            data: {
              privacy_notice_version: PRIVACY_VERSION,
              privacy_acknowledged_at: new Date().toISOString(),
            },
          },
        });
        return error?.message ?? (data.session ? null : CONFIRMATION_REQUIRED);
      }
      case AuthMode.Forgot: {
        const { error } = await client.auth.resetPasswordForEmail(credentials.email, {
          redirectTo: location.origin + '/update-password',
        });
        return error?.message ?? 'If an account exists, you will receive a reset link.';
      }
      case AuthMode.Update: {
        if (!this.recovery()) return 'Open a valid password reset link to continue.';
        const { error } = await client.auth.updateUser({ password: credentials.password });
        if (error) return error.message;
        this.recovery.set(false);
        return null;
      }
      case AuthMode.Login: {
        const { error } = await client.auth.signInWithPassword(credentials);
        return error?.message ?? null;
      }
    }
  }

  private async initialize(): Promise<void> {
    if (!this.config.supabaseUrl || !this.config.supabasePublishableKey) return;
    const { createClient } = await import('@supabase/supabase-js');
    const client: SupabaseClient = createClient(
      this.config.supabaseUrl,
      this.config.supabasePublishableKey,
    );
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
  const auth: Auth = inject(Auth);
  const router: Router = inject(Router);
  await auth.ready;
  return auth.signedIn() || router.createUrlTree(['/login']);
};

export const adminOnly: CanActivateFn = async () => {
  const auth: Auth = inject(Auth);
  const router: Router = inject(Router);
  await auth.ready;
  if (!auth.signedIn()) return router.createUrlTree(['/login']);
  return (await firstValueFrom(auth.checkAdmin())) || router.createUrlTree(['/']);
};

export const apiToken: HttpInterceptorFn = (request, next) => {
  const token: string | undefined = inject(Auth).session()?.access_token;
  const url: URL = new URL(request.url, location.origin);
  return next(
    token && url.origin === location.origin && url.pathname.startsWith('/api/')
      ? request.clone({ setHeaders: { Authorization: 'Bearer ' + token } })
      : request,
  );
};
