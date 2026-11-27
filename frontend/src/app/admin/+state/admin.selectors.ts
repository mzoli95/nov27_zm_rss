import { createFeatureSelector } from '@ngrx/store';
import type { AdminState } from './admin.reducer';

export const selectAdmin = createFeatureSelector<AdminState>('admin');
