import { createReducer, on } from '@ngrx/store';
import { adminActions, UserPage } from './admin.actions';

export interface AdminState {
  saving: boolean;
  loading: boolean;
  message: string;
  error: string;
  users: UserPage;
}
const initial: AdminState = {
  saving: false,
  loading: false,
  message: '',
  error: '',
  users: { items: [], page: 1, hasNext: false },
};
export const adminReducer = createReducer(
  initial,
  on(adminActions.loadUsers, (state): AdminState => ({ ...state, loading: true, error: '' })),
  on(adminActions.usersLoaded, (state, { users }): AdminState => ({
    ...state,
    loading: false,
    users,
  })),
  on(adminActions.usersFailed, (state, { message }): AdminState => ({
    ...state,
    loading: false,
    error: message,
  })),
  on(adminActions.saveRole, (state): AdminState => ({
    ...state,
    saving: true,
    message: '',
    error: '',
  })),
  on(adminActions.roleCompleted, (state, { message }): AdminState => ({
    ...state,
    saving: false,
    message,
  })),
);
