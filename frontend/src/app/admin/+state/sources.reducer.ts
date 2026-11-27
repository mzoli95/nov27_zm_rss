import { createReducer, on } from '@ngrx/store';
import { SourcePage, sourcesActions } from './sources.actions';

export interface SourcesState {
  topics: string[];
  sources: SourcePage;
  busy: boolean;
  message: string;
  error: string;
  saved: boolean;
}
const initial: SourcesState = {
  topics: [],
  sources: { items: [], page: 1, total: 0, pageSize: 10 },
  busy: false,
  message: '',
  error: '',
  saved: false,
};

export const sourcesReducer = createReducer(
  initial,
  on(sourcesActions.editorOpened, (state): SourcesState => ({
    ...state,
    message: '',
    error: '',
    saved: false,
  })),
  on(
    sourcesActions.load,
    sourcesActions.save,
    sourcesActions.run,
    sourcesActions.setAvailability,
    sourcesActions.test,
    sourcesActions.delete,
    (state): SourcesState => ({ ...state, busy: true, message: '', error: '', saved: false }),
  ),
  on(sourcesActions.loaded, (_, { topics, sources, message, saved }): SourcesState => ({
    topics,
    sources,
    busy: false,
    message,
    error: '',
    saved,
  })),
  on(sourcesActions.tested, (state, { count }): SourcesState => ({
    ...state,
    busy: false,
    message: 'Source responded with ' + count + ' readable items.',
  })),
  on(sourcesActions.failed, (state, { message }): SourcesState => ({
    ...state,
    busy: false,
    error: message,
  })),
);
