import { Component, Signal, inject } from '@angular/core';
import { Auth } from '../auth/auth';
@Component({
  template: '<h1 class="text-3xl font-bold">Profile</h1><p class="mt-4">{{ email() }}</p>',
})
export class Profile {
  protected readonly email: Signal<string> = inject(Auth).email;
}
