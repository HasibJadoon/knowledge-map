import { Component } from '@angular/core';
import { Router } from '@angular/router';

import {
  CardComponent,
  CardBodyComponent,
  ColComponent,
  RowComponent
} from '@coreui/angular';

import { IconComponent } from '@coreui/icons-angular';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  imports: [
    CardComponent,
    CardBodyComponent,
    RowComponent,
    ColComponent,
    IconComponent
  ]
})
export class DashboardComponent {
  constructor(private router: Router) {}

  go(path: string) {
    this.router.navigate([path]);
  }
}
