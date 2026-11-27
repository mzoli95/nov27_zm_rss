import { createFeatureSelector } from '@ngrx/store';
import type { SourcesState } from './sources.reducer';
export const selectSources = createFeatureSelector<SourcesState>('sources');
