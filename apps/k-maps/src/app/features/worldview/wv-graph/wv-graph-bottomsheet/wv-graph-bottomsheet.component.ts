import {
  ChangeDetectionStrategy, Component, ElementRef, EventEmitter,
  Input, OnChanges, Output, ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';
import {
  WvGraphNode, WvGraphEdge, WvGraphData,
  WV_NODE_COLORS, WV_NODE_LABELS, WvEdgeRelation,
} from '../wv-graph.model';

@Component({
  selector: 'app-wv-graph-bottomsheet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './wv-graph-bottomsheet.component.html',
  styleUrl: './wv-graph-bottomsheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WvGraphBottomsheetComponent implements OnChanges {
  @ViewChild('sheetEl') sheetRef?: ElementRef<HTMLElement>;

  @Input() node: WvGraphNode | null = null;
  @Input() graphData: WvGraphData | null = null;
  @Output() close       = new EventEmitter<void>();
  @Output() navigateTo  = new EventEmitter<WvGraphNode>();

  get visible(): boolean { return !!this.node; }
  get nodeColor(): string { return this.node ? WV_NODE_COLORS[this.node.type].stroke : '#c9a84c'; }
  get nodeLabel(): string { return this.node ? WV_NODE_LABELS[this.node.type] : ''; }

  get connections(): Array<{ node: WvGraphNode; relation: WvEdgeRelation; dir: 'out' | 'in' }> {
    if (!this.node || !this.graphData) return [];
    const id = this.node.id;
    const nodeMap = new Map(this.graphData.nodes.map(n => [n.id, n]));
    const result: Array<{ node: WvGraphNode; relation: WvEdgeRelation; dir: 'out' | 'in' }> = [];
    for (const e of this.graphData.edges) {
      const s = typeof e.source === 'string' ? e.source : (e.source as WvGraphNode).id;
      const t = typeof e.target === 'string' ? e.target : (e.target as WvGraphNode).id;
      if (s === id) { const n = nodeMap.get(t); if (n) result.push({ node: n, relation: e.relation, dir: 'out' }); }
      else if (t === id) { const n = nodeMap.get(s); if (n) result.push({ node: n, relation: e.relation, dir: 'in' }); }
    }
    return result;
  }

  connColor(type: WvGraphNode['type']): string { return WV_NODE_COLORS[type].stroke; }

  relationLabel(rel: WvEdgeRelation): string {
    return ({ supports:'supports', part_of:'part of', contrasts_with:'contrasts with',
              leads_to:'leads to', questions:'questions', related_to:'related to' })[rel] ?? rel;
  }

  ngOnChanges(): void {
    if (this.node) {
      requestAnimationFrame(() => {
        const el = this.sheetRef?.nativeElement;
        if (el) gsap.fromTo(el, { y: '100%' }, { y: '0%', duration: 0.36, ease: 'expo.out' });
      });
    }
  }

  dismiss(): void {
    const el = this.sheetRef?.nativeElement;
    if (el) {
      gsap.to(el, { y: '100%', duration: 0.26, ease: 'expo.in', onComplete: () => this.close.emit() });
    } else {
      this.close.emit();
    }
  }
}
