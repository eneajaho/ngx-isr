import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `<router-outlet></router-outlet>`,
})
export class AppComponent {
  constructor() {
    setTimeout(() => {
      console.log('Hello from the app component!');
    }, 2000);
  }
}
