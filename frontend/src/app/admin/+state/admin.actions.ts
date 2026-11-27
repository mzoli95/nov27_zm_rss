import { createActionGroup, props } from '@ngrx/store';
import { AppRole } from '../../auth/auth';

export const adminActions = createActionGroup({
  source: 'Admin',
  events: {
    'Save role': props<{ userId: string; role: AppRole }>(),
    'Role completed': props<{ message: string }>(),
  },
});
