import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StudioApiService } from '../../studio-api.service';
import {
  EPISODE_FORMATS, EpisodeAggregate, EpisodeFormat, Participant, Section, TalkingPoint,
  TemplateStructure,
} from '../../studio.models';

const SECTION_TYPE_LABELS: Record<string, string> = {
  intro: 'Intro',
  main_point: 'Main point',
  discussion: 'Discussion',
  conclusion: 'Conclusion',
  custom: 'Section',
};

@Component({
  selector: 'km-studio-episode-builder',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="st-page">
      <div class="st-wrap">
        <div class="st-topbar">
          <a class="st-back" routerLink="/studio">← Studio</a>
          @if (episode()) {
            <button type="button" class="st-btn st-btn--gold" (click)="startSession()">
              ● Go live
            </button>
          }
        </div>

        @if (loading()) {
          <div class="st-state">Loading episode…</div>
        } @else if (episode(); as ep) {

          <input class="st-title" [value]="ep.title" placeholder="Untitled Episode"
                 (blur)="onTitleBlur($event)" />

          <div class="st-row">
            <label class="st-row-label">Format</label>
            <select class="st-select" [value]="ep.format" (change)="onFormatChange($event)">
              @for (f of formats; track f.id) {
                <option [value]="f.id">{{ f.label }}</option>
              }
            </select>
          </div>

          <div class="st-block-label">Cast</div>
          <div class="st-cast">
            @for (p of ep.participants; track p.id) {
              <span class="st-person">
                <span class="st-dot" [style.background]="p.color"></span>
                <button type="button" class="st-person-name" (click)="editPerson(p)">
                  {{ p.display_name }}
                </button>
                <button type="button" class="st-person-x" (click)="removePerson(p)">×</button>
              </span>
            }
            <button type="button" class="st-person st-person--add" (click)="addPerson()">
              ＋ Person
            </button>
          </div>

          @for (section of ep.sections; track section.id) {
            <div class="st-sec">
              <div class="st-sec-head">
                <input class="st-sec-heading" [value]="section.heading"
                       placeholder="Section heading"
                       (blur)="onSectionHeadingBlur(section, $event)" />
                <button type="button" class="st-icon-btn" (click)="deleteSection(section)"
                        aria-label="Delete section">🗑</button>
              </div>
              <div class="st-sec-type">{{ sectionTypeLabel(section.type) }}</div>

              @for (point of section.points; track point.id) {
                <div class="st-pt">
                  <textarea class="st-pt-text" rows="2" placeholder="Talking point…"
                            [value]="point.text"
                            (blur)="onPointTextBlur(section, point, $event)"></textarea>
                  <div class="st-pt-foot">
                    <select class="st-select st-select--sm"
                            [value]="point.speaker_ref ?? ''"
                            (change)="onPointSpeakerChange(section, point, $event)">
                      <option value="">Anyone</option>
                      @for (p of ep.participants; track p.id) {
                        <option [value]="p.id">{{ p.display_name }}</option>
                      }
                    </select>
                    <button type="button" class="st-icon-btn" (click)="deletePoint(section, point)"
                            aria-label="Delete talking point">×</button>
                  </div>
                </div>
              }

              <button type="button" class="st-add-row" (click)="addPoint(section)">
                ＋ Talking point
              </button>
            </div>
          }

          <button type="button" class="st-add-section" (click)="addSection()">
            ＋ Add section
          </button>

          <div class="st-foot-actions">
            <button type="button" class="st-btn" (click)="saveAsTemplate()">
              ＋ Save as template
            </button>
            <button type="button" class="st-btn st-btn--danger" (click)="deleteEpisode()">
              Delete episode
            </button>
          </div>

        } @else {
          <div class="st-state">Episode not found.</div>
        }
      </div>

      @if (toast()) { <div class="st-toast">{{ toast() }}</div> }
    </div>
  `,
  styles: [`
    .st-page {
      min-height: 100dvh; background: var(--km-bg, #080808);
      color: var(--km-text, rgba(255,255,255,0.92));
      font-family: var(--km-font-body, system-ui, sans-serif); overflow-y: auto;
    }
    .st-wrap { max-width: 720px; margin: 0 auto; padding: 20px 20px 60px; }
    .st-topbar { display: flex; align-items: center; justify-content: space-between; }
    .st-back { color: rgba(255,255,255,0.55); text-decoration: none; font-size: 0.85rem; }
    .st-back:hover { color: var(--km-gold, #c9a84c); }
    .st-state { padding: 50px 0; text-align: center; color: rgba(255,255,255,0.45); }

    .st-btn {
      padding: 8px 14px; border-radius: 9px; font-size: 0.82rem; cursor: pointer;
      background: rgba(255,255,255,0.06); color: var(--km-text, #fff);
      border: 1px solid rgba(255,255,255,0.12);
    }
    .st-btn:hover { border-color: rgba(201,168,76,0.5); }
    .st-btn--gold {
      background: var(--km-gold, #c9a84c); color: #14110b; font-weight: 600;
      border-color: var(--km-gold, #c9a84c);
    }
    .st-btn--danger { color: #e0584e; border-color: rgba(224,88,78,0.3); }

    .st-title {
      width: 100%; margin: 22px 0 8px; padding: 6px 0; background: transparent;
      border: none; border-bottom: 1px solid rgba(255,255,255,0.1); outline: none;
      color: var(--km-text, #fff); font-size: 1.5rem; font-weight: 600;
      font-family: var(--km-font-heading, Georgia, serif);
    }
    .st-title:focus { border-bottom-color: var(--km-gold, #c9a84c); }

    .st-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; }
    .st-row-label { font-size: 0.82rem; color: rgba(255,255,255,0.5); }
    .st-select {
      padding: 7px 10px; border-radius: 8px; font-size: 0.84rem;
      background: var(--km-surface-2, #141414); color: var(--km-text, #fff);
      border: 1px solid rgba(255,255,255,0.12);
    }
    .st-select--sm { font-size: 0.76rem; padding: 5px 8px; max-width: 60%; }

    .st-block-label {
      margin: 16px 0 8px; font-size: 0.66rem; font-weight: 700; letter-spacing: 0.09em;
      text-transform: uppercase; color: rgba(255,255,255,0.4);
    }
    .st-cast { display: flex; flex-wrap: wrap; gap: 8px; }
    .st-person {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 5px 8px 5px 10px; border-radius: 16px; font-size: 0.82rem;
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
    }
    .st-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
    .st-person-name {
      background: transparent; border: none; color: var(--km-text, #fff);
      cursor: pointer; font-size: 0.82rem; padding: 0;
    }
    .st-person-x {
      background: transparent; border: none; color: rgba(255,255,255,0.4);
      cursor: pointer; font-size: 1rem; line-height: 1; padding: 0 2px;
    }
    .st-person-x:hover { color: #e0584e; }
    .st-person--add {
      color: var(--km-gold, #c9a84c); border-style: dashed; cursor: pointer;
      padding: 6px 12px;
    }

    .st-sec {
      margin: 14px 0; padding: 10px 12px; border-radius: 12px;
      background: var(--km-surface, #0d0d0d); border: 1px solid rgba(255,255,255,0.07);
    }
    .st-sec-head { display: flex; align-items: center; gap: 8px; }
    .st-sec-heading {
      flex: 1; background: transparent; border: none; outline: none;
      color: var(--km-text, #fff); font-size: 1rem; font-weight: 600;
    }
    .st-sec-type {
      margin: 2px 0 8px; font-size: 0.62rem; font-weight: 700; letter-spacing: 0.08em;
      text-transform: uppercase; color: var(--km-gold, #c9a84c);
    }
    .st-icon-btn {
      background: transparent; border: none; cursor: pointer; font-size: 0.95rem;
      color: rgba(255,255,255,0.45); padding: 4px 6px;
    }
    .st-icon-btn:hover { color: #e0584e; }

    .st-pt {
      margin: 6px 0; padding: 8px; border-radius: 9px;
      background: rgba(255,255,255,0.03);
    }
    .st-pt-text {
      width: 100%; resize: vertical; background: transparent; border: none; outline: none;
      color: var(--km-text, #fff); font-size: 0.9rem; font-family: inherit; line-height: 1.4;
    }
    .st-pt-foot {
      display: flex; align-items: center; justify-content: space-between; margin-top: 4px;
    }

    .st-add-row {
      width: 100%; margin-top: 6px; padding: 8px; cursor: pointer;
      background: transparent; border: 1px dashed rgba(255,255,255,0.14);
      border-radius: 8px; color: var(--km-gold, #c9a84c); font-size: 0.8rem;
    }
    .st-add-section {
      width: 100%; margin: 12px 0 4px; padding: 12px; cursor: pointer;
      background: rgba(201,168,76,0.1); border: none; border-radius: 10px;
      color: var(--km-gold, #c9a84c); font-size: 0.88rem; font-weight: 600;
    }

    .st-foot-actions {
      display: flex; gap: 10px; justify-content: space-between;
      margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.07);
    }

    .st-toast {
      position: fixed; left: 50%; bottom: 26px; transform: translateX(-50%);
      padding: 10px 18px; border-radius: 10px; font-size: 0.84rem;
      background: var(--km-surface-2, #141414); color: var(--km-text, #fff);
      border: 1px solid rgba(201,168,76,0.4);
    }
  `],
})
export class EpisodeBuilderComponent implements OnInit {
  private studio = inject(StudioApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly formats = EPISODE_FORMATS;

  episode = signal<EpisodeAggregate | null>(null);
  loading = signal(true);
  toast = signal('');

  private episodeId = '';

  ngOnInit(): void {
    this.episodeId = this.route.snapshot.paramMap.get('episodeId') ?? '';
    if (this.episodeId) this.reload();
    else this.loading.set(false);
  }

  sectionTypeLabel(type: string): string {
    return SECTION_TYPE_LABELS[type] ?? 'Section';
  }

  private reload(): void {
    this.studio.getEpisode(this.episodeId).subscribe({
      next: (ep) => { this.episode.set(ep); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  // ── Episode fields ───────────────────────────────────────────────────────────

  onTitleBlur(ev: Event): void {
    const title = this.val(ev).trim();
    if (!title) return;
    this.patchEpisodeLocal({ title });
    this.studio.updateEpisode(this.episodeId, { title }).subscribe({ error: () => {} });
  }

  onFormatChange(ev: Event): void {
    const format = this.val(ev);
    if (!format) return;
    this.patchEpisodeLocal({ format: format as EpisodeFormat });
    this.studio.updateEpisode(this.episodeId, { format }).subscribe({ error: () => {} });
  }

  // ── Participants ─────────────────────────────────────────────────────────────

  addPerson(): void {
    const name = (window.prompt('Name of the person:') ?? '').trim();
    if (!name) return;
    this.studio.addParticipant(this.episodeId, { display_name: name })
      .subscribe({ next: () => this.reload(), error: () => {} });
  }

  editPerson(person: Participant): void {
    const name = (window.prompt('Edit name:', person.display_name) ?? '').trim();
    if (!name || name === person.display_name) return;
    this.studio.updateParticipant(person.id, { display_name: name })
      .subscribe({ next: () => this.reload(), error: () => {} });
  }

  removePerson(person: Participant): void {
    if (!window.confirm(`Remove ${person.display_name} from the cast?`)) return;
    this.studio.deleteParticipant(person.id)
      .subscribe({ next: () => this.reload(), error: () => {} });
  }

  // ── Sections ─────────────────────────────────────────────────────────────────

  addSection(): void {
    this.studio.addSection(this.episodeId, { heading: 'New Section', type: 'custom' })
      .subscribe({ next: () => this.reload(), error: () => {} });
  }

  onSectionHeadingBlur(section: Section, ev: Event): void {
    const heading = this.val(ev).trim();
    if (!heading) return;
    this.patchSectionLocal(section.id, { heading });
    this.studio.updateSection(section.id, { heading }).subscribe({ error: () => {} });
  }

  deleteSection(section: Section): void {
    if (!window.confirm(`Delete "${section.heading}" and its talking points?`)) return;
    this.studio.deleteSection(section.id)
      .subscribe({ next: () => this.reload(), error: () => {} });
  }

  // ── Talking points ───────────────────────────────────────────────────────────

  addPoint(section: Section): void {
    this.studio.addPoint(section.id, { text: '' })
      .subscribe({ next: () => this.reload(), error: () => {} });
  }

  onPointTextBlur(section: Section, point: TalkingPoint, ev: Event): void {
    const text = this.val(ev);
    this.patchPointLocal(section.id, point.id, { text });
    this.studio.updatePoint(point.id, { text }).subscribe({ error: () => {} });
  }

  onPointSpeakerChange(section: Section, point: TalkingPoint, ev: Event): void {
    const value = this.val(ev);
    const speakerRef = value ? value : null;
    this.patchPointLocal(section.id, point.id, { speaker_ref: speakerRef });
    this.studio.updatePoint(point.id, { speaker_ref: speakerRef }).subscribe({ error: () => {} });
  }

  deletePoint(section: Section, point: TalkingPoint): void {
    this.studio.deletePoint(point.id)
      .subscribe({ next: () => this.reload(), error: () => {} });
  }

  // ── Episode actions ──────────────────────────────────────────────────────────

  deleteEpisode(): void {
    if (!window.confirm('Delete this episode and all of its sections and talking points?')) return;
    this.studio.deleteEpisode(this.episodeId).subscribe({
      next: () => this.router.navigate(['/studio']),
      error: () => {},
    });
  }

  saveAsTemplate(): void {
    const ep = this.episode();
    if (!ep) return;
    const name = (window.prompt('Template name:', ep.title) ?? '').trim();
    if (!name) return;
    this.studio
      .createTemplate({ name, format: ep.format, structure: this.buildStructure(ep) })
      .subscribe({
        next: () => this.flash('Template saved.'),
        error: () => this.flash('Could not save the template.'),
      });
  }

  startSession(): void {
    this.studio.startSession(this.episodeId).subscribe({
      next: (session) => this.router.navigate(['/studio/session', session.room_code]),
      error: () => this.flash('Could not start the live session.'),
    });
  }

  /** Convert the loaded episode into a reusable template blueprint. */
  private buildStructure(ep: EpisodeAggregate): TemplateStructure {
    const roleByParticipant = new Map<string, string>();
    const participants = ep.participants.map((p, i) => {
      const role = i === 0 ? 'host' : `p${i}`;
      roleByParticipant.set(p.id, role);
      return { role, display_name: p.display_name };
    });
    const sections = ep.sections.map((s) => ({
      type: s.type,
      heading: s.heading,
      points: s.points.map((pt) => ({
        text: pt.text,
        speaker_role: pt.speaker_ref ? roleByParticipant.get(pt.speaker_ref) ?? null : null,
      })),
    }));
    return { participants, sections };
  }

  // ── Local state + helpers ────────────────────────────────────────────────────

  private flash(message: string): void {
    this.toast.set(message);
    setTimeout(() => this.toast.set(''), 2200);
  }

  private patchEpisodeLocal(patch: Partial<EpisodeAggregate>): void {
    const ep = this.episode();
    if (ep) this.episode.set({ ...ep, ...patch });
  }

  private patchSectionLocal(sectionId: string, patch: Partial<Section>): void {
    const ep = this.episode();
    if (!ep) return;
    this.episode.set({
      ...ep,
      sections: ep.sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)),
    });
  }

  private patchPointLocal(sectionId: string, pointId: string, patch: Partial<TalkingPoint>): void {
    const ep = this.episode();
    if (!ep) return;
    this.episode.set({
      ...ep,
      sections: ep.sections.map((s) =>
        s.id !== sectionId
          ? s
          : { ...s, points: s.points.map((p) => (p.id === pointId ? { ...p, ...patch } : p)) },
      ),
    });
  }

  private val(ev: Event): string {
    const target = ev.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
    return target?.value ?? '';
  }
}
