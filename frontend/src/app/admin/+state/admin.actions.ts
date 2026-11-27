import { createActionGroup, props } from '@ngrx/store';
import { AppRole } from '../../auth/auth';

export interface AdminUser {
  id: string;
  email: string | null;
  role: AppRole;
}
export interface UserPage {
  items: AdminUser[];
  page: number;
  pageSize: number;
  total: number | null;
}
export const adminActions = createActionGroup({
  source: 'Admin users',
  events: {
    'Load users': props<{ page: number; search: string }>(),
    'Users loaded': props<{ users: UserPage }>(),
    'Users failed': props<{ message: string }>(),
    'Save role': props<{ userId: string; role: AppRole; page: number; search: string }>(),
    'Role completed': props<{ message: string }>(),
  },
});
