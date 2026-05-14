import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { NotesApiService } from '../../../../shared/services/content/notes-api.service';

/**
 * Local-first running-notes store with opt-in backend sync.
 *
 * Notes are persisted to localStorage immediately on every change — that
 * keeps the UI snappy and the feature usable offline / pre-login. On
 * startup the service attempts a one-shot pull from `workers/content`
 * (via NotesApiService → /api/notes); successful pulls populate any
 * local entries that don't already exist. On each local mutation we
 * fire-and-forget a sync to the backend; remoteId gets stamped on the
 * local row when the create resolves.
 *
 * Sync states (per-note):
 *   • 'local'    — only in localStorage; backend unaware
 *   • 'syncing'  — push in flight
 *   • 'synced'   — confirmed on backend, remoteId stamped
 *   • 'error'    — last push failed; will retry on next mutation
 *
 * Failures are silent (toast handled by the page); the local copy is
 * always source-of-truth for UI, so failures don't lose data.
 */
export interface NoteAnchor {
  kind: 'ayah' | 'root' | 'source';
  /** For 'ayah' kind: surah:ayah, e.g. "2:255". */
  surahAyah?: string;
  /** For 'root' kind: root_norm (e.g. "كتب"). */
  root?: string;
  /** For 'source' kind: source slug or label. */
  sourceSlug?: string;
  sourceLabel?: string;
}

export type NoteSync = 'local' | 'syncing' | 'synced' | 'error';

export interface ResearchNote {
  id: string;
  /** Plain-text body (Arabic or English — both supported). */
  text: string;
  /** Optional verse anchor — what the user was reading when they wrote it. */
  anchor?: NoteAnchor;
  createdAt: number;
  updatedAt: number;
  /** Backend note id (DB_CM) once the create has succeeded. */
  remoteId?: string;
  /** Current sync state. Default 'local' for legacy rows. */
  sync?: NoteSync;
}

const STORAGE_KEY = 'kmaps.research.notes.v2';
const LEGACY_KEY = 'kmaps.research.notes.v1';

@Injectable({ providedIn: 'root' })
export class NotesService {
  private readonly api = inject(NotesApiService);
  /** Whether the last connectivity check / sync attempt succeeded. UI can
   *  show a small "offline" pill when this flips to false. */
  readonly online = signal(true);

  readonly notes = signal<ResearchNote[]>(this.load());

  /** Newest first. */
  readonly recent = computed(() =>
    [...this.notes()].sort((a, b) => b.updatedAt - a.updatedAt),
  );

  /** Count of unsynced local-only notes — useful as a tab badge. */
  readonly pendingCount = computed(() =>
    this.notes().filter(n => (n.sync ?? 'local') !== 'synced').length,
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

    // Best-effort one-shot pull on init. Failures (offline / unauth /
    // 404) are silent; the local copy remains source-of-truth.
    this.pullRemote();
  }

  add(text: string, anchor?: NoteAnchor): ResearchNote {
    const now = Date.now();
    const note: ResearchNote = {
      id: this.newId(),
      text: text.trim(),
      anchor,
      createdAt: now,
      updatedAt: now,
      sync: 'syncing',
    };
    this.notes.update(list => [note, ...list]);
    this.pushNew(note);
    return note;
  }

  update(id: string, patch: Partial<Pick<ResearchNote, 'text' | 'anchor'>>): void {
    this.notes.update(list =>
      list.map(n =>
        n.id === id
          ? { ...n, ...patch, text: (patch.text ?? n.text).trim(), updatedAt: Date.now(), sync: n.remoteId ? 'syncing' : 'local' }
          : n,
      ),
    );
    const after = this.notes().find(n => n.id === id);
    if (after?.remoteId) this.pushUpdate(after);
  }

  remove(id: string): void {
    const target = this.notes().find(n => n.id === id);
    this.notes.update(list => list.filter(n => n.id !== id));
    if (target?.remoteId) this.pushArchive(target.remoteId);
  }

  clear(): void {
    this.notes.set([]);
  }

  // ── Backend sync (best-effort, silent failures) ─────────────────────
  private pullRemote(): void {
    this.api.listNotes('draft', '').pipe(
      catchError(() => { this.online.set(false); return of([] as never[]); }),
    ).subscribe(remote => {
      if (!Array.isArray(remote) || remote.length === 0) return;
      this.online.set(true);
      // Merge remote notes into local — by remoteId match, or insert new
      // ones the device hasn't seen yet (e.g., created on another device).
      this.notes.update(list => {
        const byRemote = new Map(list.map(n => [n.remoteId, n] as const));
        const merged = [...list];
        for (const r of remote) {
          if (byRemote.has(r.id)) continue;
          const remoteTs = Date.parse(r.updated_at ?? r.created_at ?? '') || Date.now();
          merged.push({
            id: this.newId(),
            text: r.body_md ?? '',
            createdAt: Date.parse(r.created_at) || remoteTs,
            updatedAt: remoteTs,
            remoteId: r.id,
            sync: 'synced',
          });
        }
        return merged;
      });
    });
  }

  private pushNew(note: ResearchNote): void {
    this.api.createNote({ body_md: note.text, status: 'draft' }).pipe(
      catchError(() => { this.online.set(false); return of(null as any); }),
    ).subscribe(remote => {
      if (!remote?.id) {
        this.markSync(note.id, 'error');
        return;
      }
      this.online.set(true);
      this.notes.update(list => list.map(n =>
        n.id === note.id ? { ...n, remoteId: remote.id, sync: 'synced' } : n,
      ));
      // Attach the anchor as a NoteLink when applicable.
      const link = this.anchorToLink(note.anchor);
      if (link) {
        this.api.addLink(remote.id, link).pipe(catchError(() => of(null))).subscribe();
      }
    });
  }

  private pushUpdate(note: ResearchNote): void {
    if (!note.remoteId) return;
    this.api.updateNote(note.remoteId, { body_md: note.text }).pipe(
      catchError(() => { this.online.set(false); return of(null); }),
    ).subscribe(remote => {
      this.markSync(note.id, remote ? 'synced' : 'error');
      if (remote) this.online.set(true);
    });
  }

  private pushArchive(remoteId: string): void {
    this.api.archiveNote(remoteId).pipe(catchError(() => of(null))).subscribe();
  }

  private anchorToLink(a: NoteAnchor | undefined): { target_type: 'quran_ayah' | 'ar_u_lexicon'; target_id: string } | null {
    if (!a) return null;
    if (a.kind === 'ayah' && a.surahAyah) return { target_type: 'quran_ayah', target_id: a.surahAyah };
    if (a.kind === 'root' && a.root)      return { target_type: 'ar_u_lexicon', target_id: a.root };
    return null;  // 'source' has no backend link type
  }

  private markSync(id: string, sync: NoteSync): void {
    this.notes.update(list => list.map(n => n.id === id ? { ...n, sync } : n));
  }

  private load(): ResearchNote[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.filter(this.isValidNote);
      }
      // v1 fallback — read once, migrate forward, drop the old key.
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        const parsed: unknown = JSON.parse(legacy);
        if (Array.isArray(parsed)) {
          const migrated = parsed
            .filter(this.isValidNote)
            // Tag legacy notes as 'local' so they get pushed on next mutation
            .map(n => ({ ...n, sync: 'local' as NoteSync }));
          try { localStorage.removeItem(LEGACY_KEY); } catch { /* */ }
          return migrated;
        }
      }
      return [];
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
