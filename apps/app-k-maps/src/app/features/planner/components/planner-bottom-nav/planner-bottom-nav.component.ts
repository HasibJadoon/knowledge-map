import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { createOutline, layersOutline, todayOutline } from 'ionicons/icons';

interface NavItem {
  key: string;
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-planner-bottom-nav',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './planner-bottom-nav.component.html',
  styleUrl: './planner-bottom-nav.component.scss',
})
export class PlannerBottomNavComponent {
  private readonly router = inject(Router);

  @Input() active = 'today';

  readonly items: ReadonlyArray<NavItem> = [
    { key: 'today', label: 'Today', icon: todayOutline, route: '/planner/today' },
    { key: 'plans', label: 'Plans', icon: layersOutline, route: '/planner/plans' },
    { key: 'capture', label: 'Capture', icon: createOutline, route: '/planner/capture' },
  ];

  go(item: NavItem): void {
    if (item.key === this.active) {
      return;
    }
    void this.router.navigate([item.route]);
  }
}
