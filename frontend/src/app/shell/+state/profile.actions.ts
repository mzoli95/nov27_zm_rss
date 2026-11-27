import { createActionGroup, emptyProps, props } from '@ngrx/store';

export interface Preferences {
  topics: string[];
  labels: string[];
}
export interface ProfilePreferences extends Preferences {
  availableTopics: string[];
}
export const profileActions = createActionGroup({
  source: 'Profile preferences',
  events: {
    Load: emptyProps(),
    Save: props<{ preferences: Preferences }>(),
    Loaded: props<{ profile: ProfilePreferences; saved: boolean }>(),
    Failed: props<{ message: string }>(),
  },
});
