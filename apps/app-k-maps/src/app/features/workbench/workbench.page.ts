import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

interface WorkbenchCard {
  id: string;
  label: string;
  route: string;
  glyph: string;
}

@Component({
  selector: 'app-workbench',
  standalone: true,
  imports: [IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workbench.page.html',
  styleUrl: './workbench.page.scss',
})
export class WorkbenchPage {
  private readonly router = inject(Router);

  readonly cards: WorkbenchCard[] = [
    { id: 'planner',   label: 'Planner',   route: '/planner',   glyph: '⊞' },
    { id: 'hub',       label: 'Hub',       route: '/hub',       glyph: '⬡' },
    { id: 'workspace', label: 'Workspace', route: '/workspace', glyph: '◈' },
    { id: 'docs',      label: 'Docs',      route: '/docs',      glyph: '✦' },
    { id: 'content',   label: 'Content',   route: '/content',   glyph: '▶' },
    { id: 'studio',    label: 'Studio',    route: '/studio',    glyph: '◉' },
  ];

  navigate(route: string): void {
    void this.router.navigateByUrl(route);
  }
}
