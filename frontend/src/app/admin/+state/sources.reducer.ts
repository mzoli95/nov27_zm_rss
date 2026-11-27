import { createReducer, on } from '@ngrx/store';
import { NewsSource, sourcesActions } from './sources.actions';

export interface SourcesState {
  topics: string[];
  sources: NewsSource[];
  busy: boolean;
  message: string;
  error: string;
}
const initial: SourcesState = { topics: [], sources: [], busy: false, message: '', error: '' };
export const sourcesReducer = createReducer(
  initial,
  on(sourcesActions.load, sourcesActions.save, sourcesActions.run, (state): SourcesState => ({
    ...state,
    busy: true,
    message: '',
    error: '',
  })),
  on(sourcesActions.loaded, (_, { topics, sources, message }): SourcesState => ({
    topics,
    sources,
    busy: false,
    message,
    error: '',
  })),
  on(sourcesActions.failed, (state, { message }): SourcesState => ({
    ...state,
    busy: false,
    error: message,
  })),
);
