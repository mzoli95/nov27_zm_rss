import { Routes } from '@angular/router';
import { adminOnly, signedIn } from './auth/auth';

const loadAuth = () => import('./auth/auth-page').then(m => m.AuthPage);
export const routes: Routes = [
  { path: 'login', data: { mode: 'login' }, loadComponent: loadAuth },
  { path: 'register', data: { mode: 'register' }, loadComponent: loadAuth },
  { path: 'forgot-password', data: { mode: 'forgot' }, loadComponent: loadAuth },
  { path: 'update-password', data: { mode: 'update' }, loadComponent: loadAuth },
  { path: '', canActivate: [signedIn], loadComponent: () => import('./feed/feed').then(m => m.Feed) },
  { path: 'profile', canActivate: [signedIn], loadComponent: () => import('./shell/profile').then(m => m.Profile) },
  { path: 'liked-posts', canActivate: [signedIn], data: { liked: true }, loadComponent: () => import('./feed/feed').then(m => m.Feed) },
  { path: 'notifications', canActivate: [signedIn], loadComponent: () => import('./shell/notifications').then(m => m.Notifications) },
  { path: 'admin', canActivate: [signedIn, adminOnly], loadComponent: () => import('./admin/admin').then(m => m.Admin) },
  { path: '**', redirectTo: '' },
];
