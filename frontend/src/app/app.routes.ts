import { Routes } from '@angular/router';
import { AuthMode, adminOnly, signedIn } from './auth/auth';
import type { AuthPage } from './auth/auth-page/auth-page';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { adminReducer } from './admin/+state/admin.reducer';
import { loadUsers, saveRole } from './admin/+state/admin.effects';
import { manageSources } from './admin/+state/sources.effects';
import { sourcesReducer } from './admin/+state/sources.reducer';
import { loadProfile, saveProfile } from './shell/+state/profile.effects';
import { profileReducer } from './shell/+state/profile.reducer';
import { manageDeliveryChannels, manageDeliveryPreferences } from './shell/+state/delivery.effects';
import { deliveryAdmin, deliveryPrefs } from './shell/+state/delivery.reducer';

const loadAuth = (): Promise<typeof AuthPage> => import('./auth/auth-page/auth-page').then((m) => m.AuthPage);
export const routes: Routes = [
  { path: 'login', data: { mode: AuthMode.Login }, loadComponent: loadAuth },
  { path: 'register', data: { mode: AuthMode.Register }, loadComponent: loadAuth },
  { path: 'forgot-password', data: { mode: AuthMode.Forgot }, loadComponent: loadAuth },
  { path: 'update-password', data: { mode: AuthMode.Update }, loadComponent: loadAuth },
  {
    path: '',
    canActivate: [signedIn],
    loadComponent: () => import('./feed/feed/feed').then((m) => m.Feed),
  },
  {
    path: 'profile',
    canActivate: [signedIn],
    providers: [
      provideState('profile', profileReducer),
      provideState('deliveryPrefs', deliveryPrefs),
      provideEffects({ loadProfile, saveProfile, manageDeliveryPreferences }),
    ],
    loadComponent: () => import('./shell/profile/profile').then((m) => m.Profile),
  },
  {
    path: 'liked-posts',
    canActivate: [signedIn],
    data: { liked: true },
    loadComponent: () => import('./feed/feed/feed').then((m) => m.Feed),
  },
  {
    path: 'notifications',
    canActivate: [signedIn],
    loadComponent: () => import('./shell/notifications/notifications').then((m) => m.Notifications),
  },
  {
    path: 'admin',
    canActivate: [adminOnly],
    providers: [
      provideState('admin', adminReducer),
      provideState('sources', sourcesReducer),
      provideState('deliveryAdmin', deliveryAdmin),
      provideEffects({ loadUsers, saveRole, manageSources, manageDeliveryChannels }),
    ],
    loadComponent: () => import('./admin/admin/admin').then((m) => m.Admin),
  },
  { path: '**', redirectTo: '' },
];
