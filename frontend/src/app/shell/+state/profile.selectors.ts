import { createFeatureSelector } from '@ngrx/store';
import type { ProfileState } from './profile.reducer';
export const selectProfile = createFeatureSelector<ProfileState>('profile');
