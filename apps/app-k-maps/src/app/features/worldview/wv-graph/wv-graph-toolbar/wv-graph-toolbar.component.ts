import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WvGraphMode, WvNodeType, WV_NODE_COLORS, WV_NODE_LABELS } from '../../../../shared/models/worldview/wv-graph.model';

@Component({
  selector: 'app-wv-graph-toolbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './wv-graph-toolbar.component.html',
  styleUrl: './wv-graph-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WvGraphToolbarComponent {
  @Input() mode: WvGraphMode = 'force';
  @Input() activeTypes: Set<WvNodeType> | null = null;
  @Input() showLabels = true;
  @Input() compact = false; // mobile: collapse to icons only

  @Output() modeChange       = new EventEmitter<WvGraphMode>();
  @Output() typeToggle       = new EventEmitter<WvNodeType>();
  @Output() labelsToggle     = new EventEmitter<void>();
  @Output() resetZoom        = new EventEmitter<void>();
  @Output() centerSelected   = new EventEmitter<void>();

  readonly allTypes: WvNodeType[] = ['claim','principle','framework','cause','evidence','insight'];
  readonly modes: { id: WvGraphMode; label: string; icon: string }[] = [
    { id: 'force',   label: 'Float',   icon: '⬡' },
    { id: 'focus',   label: 'Focus',   icon: '◎' },
    { id: 'cluster', label: 'Cluster', icon: '⬡⬡' },
  ];

  typeColor(type: WvNodeType): string { return WV_NODE_COLORS[type].stroke; }
  typeLabel(type: WvNodeType): string { return WV_NODE_LABELS[type]; }
  typeActive(type: WvNodeType): boolean { return !this.activeTypes || this.activeTypes.has(type); }
}
