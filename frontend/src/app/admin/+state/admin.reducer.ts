import { createReducer, on } from '@ngrx/store';
import { adminActions } from './admin.actions';

export interface AdminState {
  saving: boolean;
  message: string;
}
const initial: AdminState = { saving: false, message: '' };

export const adminReducer = createReducer(
  initial,
  on(adminActions.saveRole, (): AdminState => ({ saving: true, message: '' })),
  on(adminActions.roleCompleted, (_, { message }): AdminState => ({ saving: false, message })),
);
