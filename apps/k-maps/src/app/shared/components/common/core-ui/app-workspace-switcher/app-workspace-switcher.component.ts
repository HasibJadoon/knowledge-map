import { NgFor, NgIf } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import {
  DropdownComponent,
  DropdownMenuDirective,
  DropdownToggleDirective,
} from '@coreui/angular';
import { Workspace, WorkspaceService } from '../../../../services/workspace.service';

@Component({
  selector: 'app-workspace-switcher',
  standalone: true,
  imports: [NgIf, NgFor, DropdownComponent, DropdownMenuDirective, DropdownToggleDirective],
  templateUrl: './app-workspace-switcher.component.html',
  styleUrls: ['./app-workspace-switcher.component.scss'],
})
export class AppWorkspaceSwitcherComponent implements OnInit {
  readonly ws = inject(WorkspaceService);

  ngOnInit(): void {
    void this.ws.load();
  }

  select(workspace: Workspace): void {
    this.ws.select(workspace);
  }

  typeIcon(type: string): string {
    const icons: Record<string, string> = {
      family: '🏠',
      team: '👥',
      study_group: '📚',
      personal: '👤',
      organization: '🏢',
    };
    return icons[type] ?? '◆';
  }
}
