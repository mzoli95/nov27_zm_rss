import { Component, inject } from '@angular/core';
import { Auth } from '../auth/auth';
@Component({ template: '<h1 class="text-3xl font-bold">Profile</h1><p class="mt-4">{{ auth.session()?.user?.email }}</p>' })
export class Profile { protected readonly auth = inject(Auth); }
