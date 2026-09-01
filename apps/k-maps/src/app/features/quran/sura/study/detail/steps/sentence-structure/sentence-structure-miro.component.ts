// ─────────────────────────────────────────────────────────────────────────────
//  SentenceStructureMiroComponent
//  A modern Miro-style, pan/zoom board for the grounded sentence-structure step.
//
//  Renders, per sentence, the clause hierarchy → words as card nodes (coloured
//  by their reconciled iʿrāb role), connected by edges. Selecting any node opens
//  a nuance inspector that surfaces ALL the grounding:
//    • word   → every classical book's iʿrāb (role + full text), root → lexicon
//    • clause → type / function / governing particle / rhetorical note
//    • sentence → kind, discourse mode, balāgha, ellipsis, mufassir tafsīr
//  All data is table-sourced (StudyRepo.sentenceStructureStep); nothing is
//  authored here.
// ─────────────────────────────────────────────────────────────────────────────

import {
  ChangeDetectionStrategy, Component, computed, ElementRef,
  EventEmitter, Input, Output, signal, ViewChild, ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { hierarchy, tree as d3Tree, HierarchyPointNode } from 'd3-hierarchy';
import type {
  SsStepData, SsSentenceVm, SsClauseNodeVm, SsClauseWordVm, SsConstituencyNodeVm,
} from '../../../../../../../shared/services/quran/quran-surah.service';

// ── Layout node — the unified hierarchy fed to d3-tree ────────────────────────

type LayoutKind = 'sentence' | 'clause' | 'word';

interface LayoutNode {
  kind:      LayoutKind;
  id:        string;
  title:     string;        // primary line (Arabic)
  subtitle?: string;        // role / function label
  chip?:     string;        // particle / mode chip
  color:     string;        // accent colour
  clause?:   SsClauseNodeVm;
  word?:     SsClauseWordVm;
  audit?:    SsConstituencyNodeVm['audit'];   // role vs classical iʿrāb books
  children:  LayoutNode[];
}

interface PlacedNode { node: LayoutNode; x: number; y: number; }
interface PlacedEdge { x1: number; y1: number; x2: number; y2: number; }

const NODE_W = 188;
const NODE_H = 96;
const H_GAP  = 30;
const V_GAP  = 86;
const GOLD    = '#c9a84c';
const NEUTRAL = '#6b7280';

@Component({
  selector:        'km-sentence-structure-miro',
  standalone:      true,
  imports:         [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation:   ViewEncapsulation.None,
  templateUrl:     './sentence-structure-miro.component.html',
  styleUrl:        './sentence-structure-miro.component.scss',
})
export class SentenceStructureMiroComponent {

  @Input({ required: true }) set data(value: SsStepData | null) {
    this._data.set(value);
    this.activeIdx.set(0);
    this.selected.set(null);
    queueMicrotask(() => this.fitToScreen());
  }
  /** Emitted when a learner taps a word's root to open the Five-Lens lexicon. */
  @Output() openLexicon = new EventEmitter<{ root: string; word: string }>();

  @ViewChild('viewport') viewport?: ElementRef<HTMLDivElement>;

  private readonly _data = signal<SsStepData | null>(null);
  readonly activeIdx = signal(0);
  readonly selected  = signal<LayoutNode | null>(null);

  // Pan / zoom transform.
  readonly zoom = signal(1);
  readonly panX = signal(0);
  readonly panY = signal(0);

  readonly sentences = computed<SsSentenceVm[]>(() => this._data()?.sentences ?? []);
  readonly terms     = computed(() => this._data()?.terms ?? []);
  readonly current   = computed<SsSentenceVm | null>(() => this.sentences()[this.activeIdx()] ?? null);

  private readonly termColors = computed<Record<string, string>>(() => this._data()?.termColors ?? {});

  // ── Layout (recomputed per active sentence) ─────────────────────────────────

  private readonly layoutRoot = computed<HierarchyPointNode<LayoutNode> | null>(() => {
    const s = this.current();
    if (!s) return null;
    const root = this.buildLayout(s);
    const h = hierarchy<LayoutNode>(root, (n) => n.children);
    d3Tree<LayoutNode>().nodeSize([NODE_W + H_GAP, NODE_H + V_GAP])(h);
    return h as HierarchyPointNode<LayoutNode>;
  });

  readonly placedNodes = computed<PlacedNode[]>(() => {
    const root = this.layoutRoot();
    if (!root) return [];
    const minX = Math.min(...root.descendants().map((d) => d.x));
    return root.descendants().map((d) => ({ node: d.data, x: d.x - minX, y: d.depth * (NODE_H + V_GAP) }));
  });

  readonly placedEdges = computed<PlacedEdge[]>(() => {
    const root = this.layoutRoot();
    if (!root) return [];
    const minX = Math.min(...root.descendants().map((d) => d.x));
    return root.links().map((l) => ({
      x1: l.source.x - minX + NODE_W / 2, y1: l.source.depth * (NODE_H + V_GAP) + NODE_H,
      x2: l.target.x - minX + NODE_W / 2, y2: l.target.depth * (NODE_H + V_GAP),
    }));
  });

  readonly canvasW = computed(() => Math.max(...this.placedNodes().map((p) => p.x + NODE_W), 600) + 80);
  readonly canvasH = computed(() => Math.max(...this.placedNodes().map((p) => p.y + NODE_H), 400) + 80);

  // ── Build the unified hierarchy for one sentence ────────────────────────────

  private buildLayout(s: SsSentenceVm): LayoutNode {
    // Prefer the authored word-level constituency tree (mubtadaʾ/khabar/iḍāfa…);
    // fall back to the grounded clause hierarchy decorated with iʿrāb.
    if (s.tree) {
      return this.constituencyLayout(s.tree, true);
    }
    return {
      kind: 'sentence', id: s.id,
      title: this.kindLabel(s.kind),
      subtitle: `${s.ayah}${s.ayahTo !== s.ayah ? '–' + s.ayahTo : ''}`,
      chip: s.mode ?? undefined,
      color: GOLD,
      children: (s.clauseTree ?? []).map((c) => this.clauseLayout(c)),
    };
  }

  private constituencyLayout(n: SsConstituencyNodeVm, isRoot = false): LayoutNode {
    const hasChildren = !!(n.children && n.children.length);
    return {
      kind: isRoot ? 'sentence' : (hasChildren ? 'clause' : 'word'),
      id: n.id,
      title: n.name,
      subtitle: n.label_ar ?? undefined,
      color: (n.term_id && this.termColors()[n.term_id]) || GOLD,
      audit: n.audit,
      children: (n.children ?? []).map((k) => this.constituencyLayout(k)),
    };
  }

  /** Badge glyph for a node's iʿrāb-book audit status (empty when not audited). */
  auditMark(node: LayoutNode): string {
    switch (node.audit?.status) {
      case 'corroborated': return '✓';
      case 'divergent':    return '⚠';
      default:             return '';
    }
  }

  private clauseLayout(c: SsClauseNodeVm): LayoutNode {
    const node: LayoutNode = {
      kind: 'clause', id: c.id,
      title: this.clauseLabel(c),
      subtitle: c.type ?? undefined,
      chip: c.particle ?? undefined,
      color: GOLD,
      clause: c,
      children: [],
    };
    // Child clauses first, then the clause's own words as leaf nodes.
    node.children = [
      ...(c.children ?? []).map((k) => this.clauseLayout(k)),
      ...(c.words ?? []).map((w) => this.wordLayout(w)),
    ];
    return node;
  }

  private wordLayout(w: SsClauseWordVm): LayoutNode {
    return {
      kind: 'word', id: w.wordId,
      title: w.text,
      subtitle: w.role ?? undefined,
      color: (w.role && this.termColors()[w.role]) || NEUTRAL,
      word: w,
      children: [],
    };
  }

  // ── Labels ──────────────────────────────────────────────────────────────────

  kindLabel(kind: string | null): string {
    switch (kind) {
      case 'nominal':  return 'جملة اسمية';
      case 'verbal':   return 'جملة فعلية';
      default:         return kind ? `جملة (${kind})` : 'جملة';
    }
  }
  private clauseLabel(c: SsClauseNodeVm): string {
    return c.particle || c.function || c.type || 'جملة';
  }
  termColor(role: string | null | undefined): string {
    return (role && this.termColors()[role]) || NEUTRAL;
  }

  // ── Interaction ─────────────────────────────────────────────────────────────

  selectSentence(i: number): void {
    if (i < 0 || i >= this.sentences().length) return;
    this.activeIdx.set(i);
    this.selected.set(null);
    queueMicrotask(() => this.fitToScreen());
  }
  pick(node: LayoutNode): void {
    this.selected.set(this.selected()?.id === node.id ? null : node);
  }
  closeInspector(): void { this.selected.set(null); }

  emitLexicon(w: SsClauseWordVm): void {
    if (w.root) this.openLexicon.emit({ root: w.root, word: w.text });
  }

  // ── Pan / zoom ──────────────────────────────────────────────────────────────

  private dragging = false;
  private startX = 0; private startY = 0; private baseX = 0; private baseY = 0;

  onPointerDown(e: PointerEvent): void {
    if ((e.target as HTMLElement).closest('.ssm-node')) return; // let node clicks through
    this.dragging = true;
    this.startX = e.clientX; this.startY = e.clientY;
    this.baseX = this.panX(); this.baseY = this.panY();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  onPointerMove(e: PointerEvent): void {
    if (!this.dragging) return;
    this.panX.set(this.baseX + (e.clientX - this.startX));
    this.panY.set(this.baseY + (e.clientY - this.startY));
  }
  onPointerUp(): void { this.dragging = false; }

  onWheel(e: WheelEvent): void {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    this.zoom.set(Math.min(2.2, Math.max(0.3, this.zoom() * factor)));
  }
  zoomIn():  void { this.zoom.set(Math.min(2.2, this.zoom() * 1.15)); }
  zoomOut(): void { this.zoom.set(Math.max(0.3, this.zoom() / 1.15)); }

  fitToScreen(): void {
    const vp = this.viewport?.nativeElement;
    if (!vp) return;
    const w = this.canvasW(), h = this.canvasH();
    const z = Math.min(vp.clientWidth / w, vp.clientHeight / h, 1) * 0.96;
    this.zoom.set(Math.max(0.3, z));
    this.panX.set((vp.clientWidth - w * z) / 2);
    this.panY.set(24);
  }
}
