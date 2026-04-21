import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  WvGraphNode, WvGraphEdge, WvGraphData,
  WV_NODE_COLORS, WV_NODE_LABELS, WvEdgeRelation,
} from '../../../../shared/models/worldview/wv-graph.model';

@Component({
  selector: 'app-wv-graph-sidepanel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './wv-graph-sidepanel.component.html',
  styleUrl: './wv-graph-sidepanel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WvGraphSidepanelComponent {
  @Input() node: WvGraphNode | null = null;
  @Input() graphData: WvGraphData | null = null;
  @Output() close           = new EventEmitter<void>();
  @Output() navigateTo      = new EventEmitter<WvGraphNode>();

  get nodeColor(): string { return this.node ? WV_NODE_COLORS[this.node.type].stroke : '#c9a84c'; }
  get nodeFill():  string { return this.node ? WV_NODE_COLORS[this.node.type].fill  : 'transparent'; }
  get nodeLabel(): string { return this.node ? WV_NODE_LABELS[this.node.type] : ''; }

  get connections(): Array<{ node: WvGraphNode; relation: WvEdgeRelation; dir: 'out' | 'in' }> {
    if (!this.node || !this.graphData) return [];
    const id = this.node.id;
    const nodeMap = new Map(this.graphData.nodes.map(n => [n.id, n]));
    const result: Array<{ node: WvGraphNode; relation: WvEdgeRelation; dir: 'out' | 'in' }> = [];

    for (const e of this.graphData.edges) {
      const s = typeof e.source === 'string' ? e.source : (e.source as WvGraphNode).id;
      const t = typeof e.target === 'string' ? e.target : (e.target as WvGraphNode).id;
      if (s === id) {
        const n = nodeMap.get(t);
        if (n) result.push({ node: n, relation: e.relation, dir: 'out' });
      } else if (t === id) {
        const n = nodeMap.get(s);
        if (n) result.push({ node: n, relation: e.relation, dir: 'in' });
      }
    }
    return result;
  }

  connColor(type: WvGraphNode['type']): string { return WV_NODE_COLORS[type].stroke; }

  relationLabel(rel: WvEdgeRelation): string {
    return {
      supports:       'supports',
      part_of:        'part of',
      contrasts_with: 'contrasts with',
      leads_to:       'leads to',
      questions:      'questions',
      related_to:     'related to',
    }[rel] ?? rel;
  }
}
