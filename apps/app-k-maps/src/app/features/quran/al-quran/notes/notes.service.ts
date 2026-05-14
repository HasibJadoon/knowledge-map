import { Injectable, computed, effect, signal } from '@angular/core';

/**
 * Local-first running-notes store.
 *
 * Notes are persisted to localStorage under a single key. Each note carries
 * an optional anchor (verse / root / source) so when the user later wires
 * a real backend (DB_CM via the content worker) we can sync these into
 * structured documents without losing context.
 *
 * This is intentionally simple: no rich text, no attachments, no folders.
 * The goal is a "quick capture" affordance during study sessions.
 */
export interface ResearchNote {
  id: string;
  /** Plain-text body (Arabic or English — both supported). */
  text: string;
  /** Optional verse anchor — what the user was reading when they wrote it. */
  anchor?: {
    kind: 'ayah'  | 'root' | 'source';
    /** For 'ayah' kind: surah:ayah, e.g. "2:255". */
    surahAyah?: string;
    /** For 'root' kind: root_norm (e.g. "كتب"). */
    root?: string;
    /** For 'source' kind: source slug or label. */
    sourceSlug?: string;
    sourceLabel?: string;
  };
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'kmaps.research.notes.v1';

@Injectable({ providedIn: 'root' })
export class NotesService {
  readonly notes = signal<ResearchNote[]>(this.load());

  /** Newest first. */
  readonly recent = computed(() =>
    [...this.notes()].sort((a, b) => b.updatedAt - a.updatedAt),
  );

  constructor() {
    // Persist on every change.
    effect(() => {
      const v = this.notes();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
      } catch {
        // Storage may be full or disabled in private mode — silent.
      }
    });
  }

  add(text: string, anchor?: ResearchNote['anchor']): ResearchNote {
    const now = Date.now();
    const note: ResearchNote = {
      id: this.newId(),
      text: text.trim(),
      anchor,
      createdAt: now,
      updatedAt: now,
    };
    this.notes.update(list => [note, ...list]);
    return note;
  }

  update(id: string, patch: Partial<Pick<ResearchNote, 'text' | 'anchor'>>): void {
    this.notes.update(list =>
      list.map(n =>
        n.id === id
          ? { ...n, ...patch, text: (patch.text ?? n.text).trim(), updatedAt: Date.now() }
          : n,
      ),
    );
  }

  remove(id: string): void {
    this.notes.update(list => list.filter(n => n.id !== id));
  }

  clear(): void {
    this.notes.set([]);
  }

  private load(): ResearchNote[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Sanity-check each row — drop anything that doesn't match shape.
      return parsed.filter(this.isValidNote);
    } catch {
      return [];
    }
  }

  private isValidNote(n: unknown): n is ResearchNote {
    if (!n || typeof n !== 'object') return false;
    const o = n as Record<string, unknown>;
    return typeof o['id'] === 'string'
      && typeof o['text'] === 'string'
      && typeof o['createdAt'] === 'number'
      && typeof o['updatedAt'] === 'number';
  }

  private newId(): string {
    return 'n_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }
}
