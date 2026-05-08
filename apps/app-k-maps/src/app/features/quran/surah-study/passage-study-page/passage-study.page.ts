import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, NgZone, OnInit,
  computed, effect, inject, signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonContent, IonFooter, IonTabBar, IonTabButton, IonIcon, IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  bookOutline, chatbubbleOutline, gitBranchOutline,
  analyticsOutline, globeOutline,
} from 'ionicons/icons';
import gsap from 'gsap';
import {
  QuranSurahService,
  StudyLessonResponse,
  StudyWordVm,
  StudyExpressionVm,
  StudyAyahVm,
  WorldviewHubResponse,
  StudyTaskVm,
} from '../../../../shared/services/quran/quran-surah.service';

// ── Arabic helpers ────────────────────────────────────────────────────────────

const DIACRITICS_RE     = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g;
const END_MARKER_RE     = /[\u06DD\u06DE][\u0660-\u0669]*/g;
const ARABIC_INDIC_ONLY = /^[\u0660-\u0669]+$/;

// ── Tree types ────────────────────────────────────────────────────────────────

interface SsTreeNode {
  name:      string;
  id?:       string;
  term_id?:  string;
  label_ar?: string;
  children?: SsTreeNode[];
}

interface SsPayload {
  tree:        SsTreeNode;
  term_colors: Record<string, string>;
}

// ── Miro-style graph types ────────────────────────────────────────────────────

interface SsLayoutNode {
  node:        SsTreeNode;
  uid:         string;
  depth:       number;
  sh:          number;        // subtree height (px) — for LTR layout
  x:           number;
  y:           number;
  children:    SsLayoutNode[];
  hasChildren: boolean;
  isCollapsed: boolean;
}

interface SsGraphNode {
  uid:         string;
  name:        string;
  label_ar?:   string;
  term_id?:    string;
  termColor:   string;
  x: number;  y: number;
  cx: number; cy: number;
  w: number;  h: number;
  depth:       number;
  hasChildren: boolean;
  isCollapsed: boolean;
  childCount:  number;
}

interface SsEdge {
  x1: number; y1: number;
  x2: number; y2: number;
  color: string;
}

interface SsGraph {
  nodes:   SsGraphNode[];
  edges:   SsEdge[];
  canvasW: number;
  canvasH: number;
}

// ── Passage-structure types ───────────────────────────────────────────────────

export interface PassageSection {
  key:      string;
  title:    string;
  badge:    string;
  tone:     string;
  renderer: string;
  data:     any;
}

// ─────────────────────────────────────────────────────────────────────────────

export type StudyTab = 'reading' | 'vocab' | 'sentence' | 'expressions' | 'structure' | 'worldview';

@Component({
  selector:        'app-passage-study-page',
  standalone:      true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
    IonContent, IonFooter, IonTabBar, IonTabButton, IonIcon, IonSpinner,
  ],
  templateUrl:     './passage-study.page.html',
  styleUrl:        './passage-study.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PassageStudyPage implements OnInit {

  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly svc    = inject(QuranSurahService);
  private readonly host   = inject(ElementRef<HTMLElement>);
  private readonly zone   = inject(NgZone);
  private readonly cdr    = inject(ChangeDetectorRef);

  // ── Route params ─────────────────────────────────────────────────────────

  readonly surahId   = signal(0);
  readonly passageNo = signal(0);

  // ── API state ─────────────────────────────────────────────────────────────

  readonly lesson  = signal<StudyLessonResponse | null>(null);
  readonly wvHub   = signal<WorldviewHubResponse | null>(null);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  // ── Tab ───────────────────────────────────────────────────────────────────

  readonly activeTab = signal<StudyTab>('reading');

  // ── Reading ───────────────────────────────────────────────────────────────

  readonly showDiacritics = signal(false);

  // ── Vocab ─────────────────────────────────────────────────────────────────

  readonly showNouns = signal(true);

  // ── Sentence structure ────────────────────────────────────────────────────

  readonly ssSentences    = signal<SsPayload[]>([]);
  readonly ssIdx          = signal(0);
  readonly ssActive       = computed(() => this.ssSentences()[this.ssIdx()] ?? null);
  /** UIDs of nodes explicitly expanded by the user. Default: empty = all collapsed. */
  readonly ssExpandedSet = signal<Set<string>>(new Set<string>());

  /** Miro-style graph layout. Respects ssExpandedSet (default all collapsed). */
  readonly ssGraph = computed<SsGraph | null>(() => {
    const payload  = this.ssActive();
    if (!payload?.tree) return null;
    const expanded = this.ssExpandedSet();

    // LTR layout: root on left, children expand right
    // Horizontal axis = depth, vertical axis = sibling position
    const NW = 118, NH = 82, HLEVEL = 172, VG = 14, PAD = 16;

    const build = (n: SsTreeNode, d: number, p: string): SsLayoutNode => {
      const uid         = `${p}_${n.name.slice(0, 8)}`;
      const hasChildren = (n.children?.length ?? 0) > 0;
      const isCollapsed = hasChildren && !expanded.has(uid);
      const ch = (hasChildren && !isCollapsed)
        ? (n.children ?? []).map((c, i) => build(c, d + 1, uid + i))
        : [];
      // Subtree height: sum of children heights + gaps, min = one node
      const sh = ch.length === 0
        ? NH
        : Math.max(NH, ch.reduce((s, c) => s + c.sh, 0) + VG * (ch.length - 1));
      return { node: n, uid, depth: d, sh, x: 0, y: 0, children: ch, hasChildren, isCollapsed };
    };

    const root = build(payload.tree, 0, 'r');

    // Place nodes: x = depth level, y = centered within subtree height
    const place = (ln: SsLayoutNode, top: number): void => {
      ln.x = ln.depth * HLEVEL + PAD;
      ln.y = top + (ln.sh - NH) / 2;
      let childTop = top;
      for (const c of ln.children) { place(c, childTop); childTop += c.sh + VG; }
    };
    place(root, PAD);

    const gNodes: SsGraphNode[] = [];
    const gEdges: SsEdge[]      = [];

    const walk = (ln: SsLayoutNode): void => {
      gNodes.push({
        uid: ln.uid, name: ln.node.name, label_ar: ln.node.label_ar,
        term_id: ln.node.term_id,
        termColor: payload.term_colors[ln.node.term_id ?? ''] ?? 'rgba(201,168,76,0.7)',
        x: ln.x, y: ln.y,
        cx: ln.x + NW / 2, cy: ln.y + NH / 2,
        w: NW, h: NH, depth: ln.depth,
        hasChildren: ln.hasChildren, isCollapsed: ln.isCollapsed,
        childCount: ln.node.children?.length ?? 0,
      });
      for (const c of ln.children) {
        // LTR edges: right-center of parent → left-center of child
        gEdges.push({
          x1: ln.x + NW + 10,  y1: ln.y + NH / 2,
          x2: c.x - 10,         y2: c.y + NH / 2,
          color: payload.term_colors[c.node.term_id ?? ''] ?? 'rgba(255,255,255,0.22)',
        });
        walk(c);
      }
    };
    walk(root);

    const maxR = Math.max(...gNodes.map(n => n.x + NW));
    const maxB = Math.max(...gNodes.map(n => n.y + NH));
    return { nodes: gNodes, edges: gEdges, canvasW: maxR + PAD, canvasH: maxB + PAD };
  });

  ssToggleNode(uid: string): void {
    const next = new Set(this.ssExpandedSet());
    if (next.has(uid)) next.delete(uid); else next.add(uid);
    this.ssExpandedSet.set(next);
  }

  // Horizontal S-curve bezier for LTR tree
  edgePath(e: SsEdge): string {
    const mx = (e.x1 + e.x2) / 2;
    return `M ${e.x1} ${e.y1} C ${mx} ${e.y1} ${mx} ${e.y2} ${e.x2} ${e.y2}`;
  }

  // ── Passage structure ─────────────────────────────────────────────────────

  readonly psSections = signal<PassageSection[]>([]);
  readonly psRef      = signal('');
  readonly psIdx      = signal(0);
  readonly psActive   = computed(() => this.psSections()[this.psIdx()] ?? null);
  private psAnimating = false;

  // ── Computed from lesson ─────────────────────────────────────────────────

  readonly ayahs = computed<StudyAyahVm[]>(() =>
    [...(this.lesson()?.ayahs ?? [])].sort((a, b) => a.ayah - b.ayah));

  /** Nouns — with fallback to morphology task words. Filters D1 [null] artifacts. */
  readonly nouns = computed<StudyWordVm[]>(() => {
    const voc = (this.lesson()?.vocabulary?.nouns ?? []).filter((w): w is StudyWordVm => !!w);
    if (voc.length > 0) return voc;
    return this.morphTaskWords('noun');
  });

  readonly verbs = computed<StudyWordVm[]>(() => {
    const voc = (this.lesson()?.vocabulary?.verbs ?? []).filter((w): w is StudyWordVm => !!w);
    if (voc.length > 0) return voc;
    return this.morphTaskWords('verb');
  });

  readonly expressions = computed<StudyExpressionVm[]>(() => this.lesson()?.expressions ?? []);
  readonly unit        = computed(() => this.lesson()?.unit ?? null);
  readonly backHref    = computed(() => `/quran/sura/${this.surahId()}/study`);

  readonly ayahRange = computed(() => {
    const u = this.unit();
    if (!u) return '';
    if (!u.ayah_from) return u.start_ref ?? '';
    return u.ayah_to && u.ayah_to !== u.ayah_from
      ? `${this.surahId()}:${u.ayah_from}–${u.ayah_to}`
      : `${this.surahId()}:${u.ayah_from}`;
  });

  readonly passageTokens = computed<Array<{ type: 'word' | 'marker'; text: string; ayah?: number }[]>>(() => {
    const showD = this.showDiacritics();
    return this.ayahs().map(a => {
      const tokens: Array<{ type: 'word' | 'marker'; text: string; ayah?: number }> = [];
      let src = showD ? (a.text ?? '') : (a.text_simple ?? (a.text ?? '').replace(DIACRITICS_RE, ''));
      src = src.replace(END_MARKER_RE, '');
      src.split(/\s+/).filter(w => w.length > 0 && !ARABIC_INDIC_ONLY.test(w))
        .forEach(w => tokens.push({ type: 'word', text: w }));
      tokens.push({ type: 'marker', text: this.toArabicIndic(a.ayah), ayah: a.ayah });
      return tokens;
    });
  });

  // ── Constructor ───────────────────────────────────────────────────────────

  constructor() {
    addIcons({ bookOutline, chatbubbleOutline, gitBranchOutline, analyticsOutline, globeOutline });

    effect(() => {
      if (!this.loading() && this.lesson()) {
        requestAnimationFrame(() => this.animateIn());
      }
    });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    const sid = Number(this.route.snapshot.paramMap.get('surahId'))  || 0;
    const pno = Number(this.route.snapshot.paramMap.get('passageNo')) || 1;
    this.surahId.set(sid);
    this.passageNo.set(pno);

    this.svc.getStudyLesson(sid, pno).subscribe({
      next: (res) => {
        this.lesson.set(res);
        this.parseSsTask(res);
        this.parsePsTask(res);
        this.loading.set(false);
      },
      error: () => { this.error.set('Failed to load passage'); this.loading.set(false); },
    });

    this.svc.getWorldviewHub(sid).subscribe({
      next: (res) => this.wvHub.set(res),
      error: () => {},
    });
  }

  // ── Tab switching ─────────────────────────────────────────────────────────

  setTab(tab: StudyTab): void {
    this.activeTab.set(tab);
    requestAnimationFrame(() => {
      gsap.fromTo('.step-content',
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out' });
      if (tab === 'structure') setTimeout(() => this.dealInPsCard(true), 80);
    });
  }

  // ── Sentence structure parsing ────────────────────────────────────────────

  private parseSsTask(res: StudyLessonResponse): void {
    const task = res.tasks?.find(t => t.task_type === 'sentence_structure');
    if (!task) return;
    let payloads: SsPayload[] = [];
    if (task.children?.length) {
      payloads = [...task.children]
        .sort((a, b) => (a.step_no ?? 0) - (b.step_no ?? 0))
        .map(c => this.parseSsPayload(c))
        .filter((p): p is SsPayload => p !== null);
    }
    if (!payloads.length) {
      const root = this.parseSsPayload(task);
      if (root) payloads = [root];
    }
    this.ssSentences.set(payloads);
    this.ssIdx.set(0);
  }

  private parseSsPayload(task: StudyTaskVm): SsPayload | null {
    const raw = this.parsePayload(task.task_json);
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    if (o['tree'] && typeof o['tree'] === 'object' && o['term_colors'] && typeof o['term_colors'] === 'object') {
      return { tree: o['tree'] as SsTreeNode, term_colors: o['term_colors'] as Record<string, string> };
    }
    return null;
  }

  ssSelectIdx(i: number): void {
    if (i < 0 || i >= this.ssSentences().length) return;
    this.ssIdx.set(i);
    this.ssExpandedSet.set(new Set<string>());
    setTimeout(() => {
      const canvas = this.hostQuery('.ss-graph-canvas');
      if (canvas) gsap.fromTo(canvas, { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.28, ease: 'power2.out' });
    }, 0);
  }

  // ── Passage structure parsing ─────────────────────────────────────────────

  private parsePsTask(res: StudyLessonResponse): void {
    const task = res.tasks?.find(t => t.task_type === 'passage_structure');
    if (!task) return;
    const u = res.unit;
    if (u?.start_ref && u?.end_ref) this.psRef.set(`${u.start_ref} – ${u.end_ref}`);
    else if (u?.start_ref) this.psRef.set(u.start_ref);
    else if (u?.ayah_from && u?.ayah_to) this.psRef.set(`${u.ayah_from}–${u.ayah_to}`);
    const rootParsed = this.parsePayload(task.task_json);
    const rootSections: PassageSection[] = rootParsed?.analysis?.sections ?? rootParsed?.sections ?? [];
    if (Array.isArray(rootSections) && rootSections.length) {
      this.psSections.set(rootSections);
      const s = rootParsed?.scope?.ref;
      if (s) this.psRef.set(`${s.surah}:${s.verses}`);
      return;
    }
    const aggregated: PassageSection[] = [];
    for (const child of task.children ?? []) {
      const parsed = this.parsePayload(child.task_json);
      if (!parsed) continue;
      const sections: PassageSection[] = parsed?.analysis?.sections ?? parsed?.sections ?? [];
      if (Array.isArray(sections)) aggregated.push(...sections);
    }
    this.psSections.set(aggregated);
  }

  // ── Passage structure navigation ──────────────────────────────────────────

  psGoNext(): void {
    if (this.psIdx() < this.psSections().length - 1) this.psGoTo(this.psIdx() + 1, true);
  }
  psGoPrev(): void {
    if (this.psIdx() > 0) this.psGoTo(this.psIdx() - 1, false);
  }
  psGoTo_public(i: number): void {
    if (i !== this.psIdx()) this.psGoTo(i, i > this.psIdx());
  }

  private psGoTo(newIdx: number, forward: boolean): void {
    if (this.psAnimating) return;
    this.psAnimating = true;

    const card = this.hostQuery('.ps-card');
    if (!card) {
      this.psIdx.set(newIdx);
      this.psAnimating = false;
      return;
    }

    // Exit: CSS transition out
    card.style.transition = 'opacity 0.18s ease-in, transform 0.18s ease-in';
    card.style.opacity = '0';
    card.style.transform = `translateX(${forward ? -56 : 56}px) scale(0.96)`;

    setTimeout(() => {
      // Update index + force synchronous re-render
      this.psIdx.set(newIdx);
      this.cdr.detectChanges();

      const next = this.hostQuery('.ps-card');
      if (!next) { this.psAnimating = false; return; }

      // Enter: snap to start position, then transition to resting
      next.style.transition = 'none';
      next.style.opacity = '0';
      next.style.transform = `translateX(${forward ? 56 : -56}px) scale(0.96)`;
      next.getBoundingClientRect(); // force reflow
      next.style.transition = 'opacity 0.28s ease-out, transform 0.28s ease-out';
      next.style.opacity = '1';
      next.style.transform = 'none';

      setTimeout(() => {
        next.style.transition = '';
        this.psAnimating = false;
      }, 300);
    }, 190);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private dealInPsCard(_fromRight: boolean): void {}

  // Touch swipe — passage structure
  private psSwipeX = 0; private psSwipeY = 0;
  onPsSwipeStart(e: TouchEvent): void { this.psSwipeX = e.touches[0].clientX; this.psSwipeY = e.touches[0].clientY; }
  onPsSwipeEnd(e: TouchEvent): void {
    const dx = e.changedTouches[0].clientX - this.psSwipeX;
    const dy = e.changedTouches[0].clientY - this.psSwipeY;
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx) * 0.8) return;
    if (dx < 0) this.psGoNext(); else this.psGoPrev();
  }

  // ── Renderer helpers ──────────────────────────────────────────────────────

  discourseRows(data: any): any[]  { return data?.rows ?? []; }
  chiasmLevels(data: any): any[] {
    const levels: any[] = data?.levels ?? [];
    return levels.map((l, i) => ({ ...l, indent: Math.min(i, levels.length - 1 - i) }));
  }
  conflictLevels(data: any): any[] { return data?.levels ?? []; }
  lexiconFields(data: any): any[]  { return data?.fields ?? []; }
  purposeRows(data: any): any[] {
    const rows: any[] = data?.rows ?? [];
    // Support both [{label,text}] and string[] formats
    return rows.map(r => typeof r === 'string' ? { label: r, text: null } : r);
  }
  symbolGroups(data: any): any[]   { return data?.groups ?? []; }
  flowNodes(data: any): Array<{ text: string; highlight: boolean }> {
    const flow = data?.flow ?? []; const hl = data?.flow_highlights ?? [];
    return flow.map((text: string, i: number) => ({ text, highlight: hl.includes(i) }));
  }
  kvPairs(data: any): { key: string; value: string }[] {
    if (data?.pairs) return data.pairs;
    return Object.entries(data ?? {}).filter(([k]) => !['__type','rows','sections'].includes(k))
      .map(([key, value]) => ({ key, value: String(value) }));
  }
  clusters(data: any): any[]      { return data?.clusters ?? []; }
  timelineSteps(data: any): any[] { return data?.steps ?? []; }

  barGradient(tone: string): string {
    const map: Record<string, string> = {
      gold:      'linear-gradient(90deg,transparent,#c9a84c,transparent)',
      purple:    'linear-gradient(90deg,transparent,#a090d8,transparent)',
      ember:     'linear-gradient(90deg,transparent,#c05030,transparent)',
      moss:      'linear-gradient(90deg,transparent,#2e7c40,transparent)',
      sky:       'linear-gradient(90deg,transparent,#3a6a9a,transparent)',
      narrative: 'linear-gradient(90deg,transparent,rgba(201,168,76,.5),#a090d8,rgba(201,168,76,.5),transparent)',
      indigo:    'linear-gradient(90deg,transparent,#6070d8,transparent)',
      info:      'linear-gradient(90deg,transparent,rgba(58,106,154,.85),transparent)',
      primary:   'linear-gradient(90deg,transparent,rgba(160,144,216,.85),transparent)',
      warning:   'linear-gradient(90deg,transparent,rgba(201,168,76,.9),transparent)',
      danger:    'linear-gradient(90deg,transparent,rgba(192,80,48,.85),transparent)',
      success:   'linear-gradient(90deg,transparent,rgba(46,124,64,.85),transparent)',
      secondary: 'linear-gradient(90deg,transparent,rgba(160,160,160,.55),transparent)',
    };
    return map[tone] ?? map['secondary'];
  }

  // ── Vocab fallback ────────────────────────────────────────────────────────

  private morphTaskWords(type: 'noun' | 'verb'): StudyWordVm[] {
    const tasks = this.lesson()?.tasks ?? [];
    const task  = tasks.find(t => t.task_type === 'morphology');
    if (!task) return [];

    // Collect payloads: parent + children (same as desktop fallback)
    const payloads = [
      this.parsePayload(task.task_json),
      ...(task.children ?? []).map(c => this.parsePayload(c.task_json)),
    ];

    const items: any[] = [];
    for (const p of payloads) {
      if (!p || typeof p !== 'object') continue;
      const arr: any[] = Array.isArray(p['items'])              ? p['items'] :
                         Array.isArray(p['lexicon_morphology']) ? p['lexicon_morphology'] :
                         Array.isArray(p['words'])              ? p['words'] :
                         Array.isArray(p['vocabulary'])         ? p['vocabulary'] : [];
      for (const x of arr) { if (x && typeof x === 'object') items.push(x); }
    }

    const normalizePos = (v: unknown): 'noun' | 'verb' | null => {
      const s = (typeof v === 'string' ? v : '').toLowerCase();
      if (s === 'noun') return 'noun';
      if (s === 'verb') return 'verb';
      return null;
    };

    return items
      .filter(w => normalizePos(w['pos'] ?? w['class_name']) === type)
      .map(w => {
        const tr   = w['translation'] && typeof w['translation'] === 'object' ? w['translation'] : null;
        const mf   = w['morph_features'] ?? {};
        return {
          word_id:     w['ar_token_occ_id'] ?? w['word_location'] ?? w['word_id'] ?? w['id'] ?? '',
          ayah:        w['ayah'] ?? 0,
          position:    w['token_index'] ?? w['position'] ?? 0,
          word:        w['surface_ar'] ?? w['word'] ?? w['text'] ?? w['surface'] ?? '',
          simple:      w['surface_norm'] ?? w['simple'] ?? undefined,
          translation: (tr ? tr['primary'] : null) ?? w['translation'] ?? w['meaning'] ?? undefined,
          lemma:       w['lemma_ar'] ?? w['lemma'] ?? undefined,
          root:        w['root_norm'] ?? w['root'] ?? undefined,
          gloss:       (tr ? tr['primary'] : null) ?? w['gloss'] ?? undefined,
          meanings:    Array.isArray(w['meanings']) ? w['meanings'][0] : (w['meanings'] ?? undefined),
          verb_form:   mf['form_number'] ?? w['verb_form'] ?? undefined,
          pattern:     w['morph_pattern'] ?? w['pattern'] ?? undefined,
          transitivity:mf['transitivity'] ?? w['transitivity'] ?? undefined,
        } as StudyWordVm;
      });
  }

  // ── Nav ───────────────────────────────────────────────────────────────────

  goWorldview(): void {
    this.router.navigate(['/quran/sura', this.surahId(), 'worldview']);
  }

  // ── Misc ─────────────────────────────────────────────────────────────────

  toArabicIndic(n: number): string {
    return n.toString().replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
  }

  parseJson(raw: unknown): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') { try { const v = JSON.parse(raw); return Array.isArray(v) ? v : []; } catch { return []; } }
    return [];
  }

  private parsePayload(raw: unknown): any {
    if (!raw) return null;
    if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return null; } }
    return raw;
  }

  private animateIn(): void {
    gsap.fromTo('.step-content', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
  }

  private hostQuery(sel: string): HTMLElement | null {
    return this.host.nativeElement.querySelector(sel) as HTMLElement | null;
  }
}
