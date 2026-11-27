import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/root-shell/app';
import { APP_CONFIG, AppConfig } from './app/auth/auth';

async function start(): Promise<void> {
  const config: AppConfig | null = await fetch('/api/config', { cache: 'no-store' })
    .then(async (response) => (response.ok ? ((await response.json()) as AppConfig) : null))
    .catch(() => null);
  await bootstrapApplication(App, {
    providers: [
      ...appConfig.providers,
      {
        provide: APP_CONFIG,
        useValue: config ?? { supabaseUrl: '', supabasePublishableKey: '' },
      },
    ],
  });
}
void start().catch(console.error);
