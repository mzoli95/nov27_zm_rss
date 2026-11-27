import { Component } from '@angular/core';
@Component({
  template: `<h1 class="text-3xl font-bold">Administration</h1>
    <div class="mt-6 grid gap-4 sm:grid-cols-2">
      @for (section of sections; track section) {
        <section class="rounded-xl border border-line bg-white p-5">
          <h2 class="font-semibold">{{ section }}</h2><p class="mt-1 text-sm text-muted">Coming in a later milestone.</p>
        </section>
      }
    </div>`,
})
export class Admin { protected readonly sections = ['Users', 'Alert rules', 'News sources', 'Delivery channels']; }
