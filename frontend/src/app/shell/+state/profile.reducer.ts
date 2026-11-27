import { createReducer, on } from '@ngrx/store';
import { profileActions, ProfilePreferences } from './profile.actions';

export interface ProfileState {
  profile: ProfilePreferences | null;
  pending: boolean;
  message: string;
  error: string;
}
const initial: ProfileState = { profile: null, pending: false, message: '', error: '' };
export const profileReducer = createReducer(
  initial,
  on(profileActions.load, (): ProfileState => ({ ...initial, pending: true })),
  on(profileActions.save, (state): ProfileState => ({
    ...state,
    pending: true,
    message: '',
    error: '',
  })),
  on(profileActions.loaded, (_, { profile, saved }): ProfileState => ({
    profile,
    pending: false,
    message: saved ? 'Preferences saved.' : '',
    error: '',
  })),
  on(profileActions.failed, (state, { message }): ProfileState => ({
    ...state,
    pending: false,
    error: message,
  })),
);
