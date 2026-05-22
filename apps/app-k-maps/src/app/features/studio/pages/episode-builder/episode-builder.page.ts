import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, inject, OnInit, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, IonicModule, ToastController } from '@ionic/angular';
import { StudioApiService } from '../../services/studio-api.service';
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
  selector: 'app-episode-builder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/studio" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>
          @if (!loading()) {
            <input class="km-ep-title"
                   [value]="episode()?.title ?? ''"
                   placeholder="Untitled Episode"
                   (blur)="onTitleBlur($event)" />
          }
        </ion-title>
        <ion-buttons slot="end">
          @if (isTalkingHead()) {
            <ion-button (click)="record()" fill="clear" aria-label="Record talking head">
              <ion-icon slot="icon-only" name="videocam-outline"></ion-icon>
            </ion-button>
          } @else {
            <ion-button (click)="startSession()" fill="clear" aria-label="Start live session">
              <ion-icon slot="icon-only" name="radio-outline"></ion-icon>
            </ion-button>
          }
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (loading()) {
        <div class="km-ep-center"><ion-spinner name="dots"></ion-spinner></div>
      } @else if (episode(); as ep) {

        <ion-item lines="full" class="km-ep-format">
          <ion-label>Format</ion-label>
          <ion-select interface="action-sheet" [value]="ep.format"
                      (ionChange)="onFormatChange($event)">
            @for (f of formats; track f.id) {
              <ion-select-option [value]="f.id">{{ f.label }}</ion-select-option>
            }
          </ion-select>
        </ion-item>

        @if (!isTalkingHead()) {
          <div class="km-ep-block">
            <div class="km-ep-block-head">Cast</div>
            <div class="km-ep-cast">
              @for (p of ep.participants; track p.id) {
                <button class="km-chip" (click)="editPerson(p)">
                  <span class="km-chip-dot" [style.background]="p.color"></span>
                  {{ p.display_name }}
                  @if (p.core_user_ref) {
                    <ion-icon name="link" class="km-chip-link"
                              aria-label="Linked to an account"></ion-icon>
                  }
                </button>
              }
              <button class="km-chip km-chip--add" (click)="addPerson()">+ Person</button>
            </div>
          </div>
        } @else {
          <div class="km-ep-block">
            <div class="km-ep-th-note">
              Solo talking head — swipe through these cards while you record.
            </div>
          </div>
        }

        @for (section of ep.sections; track section.id) {
          <ion-card class="km-sec">
            <div class="km-sec-head">
              <input class="km-sec-heading" [value]="section.heading"
                     placeholder="Section heading"
                     (blur)="onSectionHeadingBlur(section, $event)" />
              <ion-button fill="clear" size="small" color="medium" (click)="deleteSection(section)">
                <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
              </ion-button>
            </div>
            <div class="km-sec-type">{{ sectionTypeLabel(section.type) }}</div>

            @for (point of section.points; track point.id) {
              <div class="km-pt">
                <ion-textarea class="km-pt-text" [autoGrow]="true" [rows]="1"
                              [placeholder]="isTalkingHead() ? 'Card — what to say…' : 'Talking point…'"
                              [value]="point.text"
                              (ionBlur)="onPointTextBlur(section, point, $event)"></ion-textarea>
                @if (isTalkingHead()) {
                  <input class="km-pt-bridge" [value]="point.bridge ?? ''"
                         placeholder="↪ Bridge to the next card — a question or thought…"
                         (blur)="onPointBridgeBlur(section, point, $event)" />
                }
                <div class="km-pt-foot">
                  @if (isTalkingHead()) {
                    <label class="km-pt-est">~<input type="number" inputmode="numeric"
                             min="0" placeholder="—" [value]="point.est_seconds ?? ''"
                             (blur)="onPointEstBlur(section, point, $event)" />s</label>
                  } @else {
                    <ion-select class="km-pt-speaker" interface="popover" placeholder="Anyone"
                                [value]="point.speaker_ref ?? ''"
                                (ionChange)="onPointSpeakerChange(section, point, $event)">
                      <ion-select-option value="">Anyone</ion-select-option>
                      @for (p of ep.participants; track p.id) {
                        <ion-select-option [value]="p.id">{{ p.display_name }}</ion-select-option>
                      }
                    </ion-select>
                  }
                  <ion-button fill="clear" size="small" color="medium"
                              (click)="deletePoint(section, point)">
                    <ion-icon slot="icon-only" name="close-outline"></ion-icon>
                  </ion-button>
                </div>
              </div>
            }

            <button class="km-add-row" (click)="addPoint(section)">
              {{ isTalkingHead() ? '+ Card' : '+ Talking point' }}
            </button>
          </ion-card>
        }

        <button class="km-add-section" (click)="addSection()">+ Add section</button>

        <div class="km-ep-actions">
          <ion-button expand="block" fill="outline" size="small" (click)="saveAsTemplate()">
            <ion-icon slot="start" name="bookmark-outline"></ion-icon>
            Save as template
          </ion-button>
        </div>

        <div class="km-ep-danger">
          <ion-button expand="block" fill="clear" color="danger" size="small"
                      (click)="deleteEpisode()">
            Delete episode
          </ion-button>
        </div>

      } @else {
        <div class="km-ep-center"><p>Episode not found.</p></div>
      }
    </ion-content>
  `,
  styles: [`
    :host { display: block; }
    ion-content {
      --background: radial-gradient(150% 80% at 50% 0%, #18160f 0%, #0b0a08 56%);
    }
    .km-ep-center { display: flex; justify-content: center; padding: 60px 0; color: var(--ion-color-medium); }

    .km-ep-title {
      width: 100%; background: transparent; border: none; outline: none;
      color: var(--ion-text-color); font-size: 1rem; font-weight: 600; text-align: center;
    }

    .km-ep-format { --min-height: 46px; }
    .km-ep-format ion-label { font-size: 0.82rem; color: var(--ion-color-medium); }

    .km-ep-block { padding: 14px 16px 4px; }
    .km-ep-block-head {
      font-size: 0.66rem; font-weight: 700; letter-spacing: 0.09em;
      text-transform: uppercase; color: var(--ion-color-medium); margin-bottom: 8px;
    }
    .km-ep-cast { display: flex; flex-wrap: wrap; gap: 8px; }
    .km-chip {
      display: flex; align-items: center; gap: 6px;
      padding: 7px 13px; border-radius: 16px; font-size: 0.82rem;
      color: var(--ion-text-color);
      background: linear-gradient(180deg, rgba(255,255,255,0.13), rgba(255,255,255,0.03));
      border: 1px solid rgba(255,255,255,0.06);
      border-top-color: rgba(255,255,255,0.16);
      box-shadow: 0 3px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.09);
    }
    .km-chip-dot {
      width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0;
      box-shadow: 0 0 7px rgba(201,168,76,0.55), inset 0 0 2px rgba(255,255,255,0.45);
    }
    .km-chip-link { font-size: 0.82rem; color: #c9a84c; margin-left: 1px; }
    .km-chip--add {
      color: #c9a84c; border: 1px dashed rgba(201,168,76,0.45);
      background: rgba(201,168,76,0.05); box-shadow: none;
    }

    .km-sec {
      margin: 16px 12px; border-radius: 14px;
      --background: linear-gradient(180deg, #232017 0%, #131210 100%);
      border: 1px solid rgba(255,255,255,0.05);
      box-shadow:
        0 12px 26px rgba(0,0,0,0.62),
        0 2px 5px rgba(0,0,0,0.5),
        inset 0 1px 0 rgba(255,255,255,0.06);
    }
    .km-sec-head { display: flex; align-items: center; padding: 10px 6px 0 14px; }
    .km-sec-heading {
      flex: 1; background: transparent; border: none; outline: none;
      color: var(--ion-text-color); font-size: 0.98rem; font-weight: 600;
    }
    .km-sec-type {
      padding: 0 14px 8px; font-size: 0.64rem; font-weight: 700;
      letter-spacing: 0.08em; text-transform: uppercase; color: #c9a84c;
    }

    .km-pt {
      margin: 8px 10px; padding: 8px 10px; border-radius: 10px;
      background: rgba(0,0,0,0.34);
      border: 1px solid rgba(0,0,0,0.5);
      border-bottom-color: rgba(255,255,255,0.05);
      box-shadow: inset 0 2px 9px rgba(0,0,0,0.66);
    }
    .km-pt-text { --padding-start: 6px; --padding-end: 6px; font-size: 0.9rem; }
    .km-pt-foot { display: flex; align-items: center; justify-content: space-between; }
    .km-pt-speaker {
      font-size: 0.76rem; --padding-start: 6px; max-width: 70%;
      color: var(--ion-color-medium);
    }
    .km-pt-bridge {
      width: 100%; margin-top: 6px; padding: 6px;
      background: transparent; border: none;
      border-top: 1px dashed rgba(201,168,76,0.25);
      outline: none; color: #c9a84c; font-size: 0.78rem;
    }
    .km-pt-bridge::placeholder { color: rgba(201,168,76,0.5); }
    .km-pt-est {
      display: inline-flex; align-items: center; gap: 2px;
      font-size: 0.76rem; color: var(--ion-color-medium); padding-left: 6px;
    }
    .km-pt-est input {
      width: 46px; background: transparent; border: none; outline: none;
      border-bottom: 1px solid rgba(255,255,255,0.12);
      color: var(--ion-text-color); font-size: 0.78rem; text-align: center;
    }
    .km-ep-th-note {
      font-size: 0.8rem; color: var(--ion-color-medium); line-height: 1.4;
      padding: 2px 0 4px;
    }

    .km-add-row {
      margin: 4px 10px 12px; padding: 9px; width: calc(100% - 20px);
      background: rgba(0,0,0,0.22); border: 1px dashed rgba(201,168,76,0.3);
      border-radius: 9px; color: #c9a84c; font-size: 0.82rem;
      box-shadow: inset 0 1px 6px rgba(0,0,0,0.5);
    }
    .km-add-section {
      display: block; margin: 10px 12px 4px; padding: 13px; width: calc(100% - 24px);
      background: linear-gradient(180deg, rgba(201,168,76,0.22), rgba(201,168,76,0.06));
      border: 1px solid rgba(201,168,76,0.25); border-radius: 12px;
      color: #e8c96a; font-size: 0.88rem; font-weight: 600;
      box-shadow: 0 6px 15px rgba(0,0,0,0.52), inset 0 1px 0 rgba(255,255,255,0.13);
    }
    .km-ep-actions { padding: 16px 12px 0; }
    .km-ep-danger { padding: 8px 12px 40px; }
  `],
})
export class EpisodeBuilderPage implements OnInit {
  private studio = inject(StudioApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private cdr = inject(ChangeDetectorRef);

  readonly formats = EPISODE_FORMATS;

  episode = signal<EpisodeAggregate | null>(null);
  loading = signal(true);

  isTalkingHead = computed(() => this.episode()?.format === 'talking_head');

  private episodeId = '';

  ngOnInit(): void {
    this.episodeId = this.route.snapshot.paramMap.get('episodeId') ?? '';
    if (this.episodeId) this.reload();
    else this.loading.set(false);
  }

  sectionTypeLabel(type: string): string {
    return SECTION_TYPE_LABELS[type] ?? 'Section';
  }

  // ── Load ─────────────────────────────────────────────────────────────────────

  private reload(): void {
    this.studio.getEpisode(this.episodeId).subscribe({
      next: (ep) => { this.episode.set(ep); this.loading.set(false); this.cdr.markForCheck(); },
      error: () => { this.loading.set(false); this.cdr.markForCheck(); },
    });
  }

  // ── Episode fields ───────────────────────────────────────────────────────────

  onTitleBlur(ev: Event): void {
    const title = this.elValue(ev).trim();
    if (!title) return;
    this.patchEpisodeLocal({ title });
    this.studio.updateEpisode(this.episodeId, { title }).subscribe({ error: () => {} });
  }

  onFormatChange(ev: Event): void {
    const format = this.selValue(ev);
    if (!format) return;
    this.patchEpisodeLocal({ format: format as EpisodeFormat });
    this.studio.updateEpisode(this.episodeId, { format }).subscribe({ error: () => {} });
  }

  // ── Participants ─────────────────────────────────────────────────────────────

  async addPerson(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Add cast member',
      message: 'Enter their account email so they are identified in live sessions.',
      inputs: [
        { name: 'email', type: 'email', placeholder: 'Account email' },
        { name: 'name', type: 'text', placeholder: 'Display name (optional)' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Add',
          handler: (data) => {
            const email = String(data?.email ?? '').trim();
            const name = String(data?.name ?? '').trim();
            if (!email && !name) return;
            this.studio.addParticipant(this.episodeId, {
              email: email || undefined,
              display_name: name || undefined,
            }).subscribe({
              next: () => this.reload(),
              error: (err) => this.showError(err, 'Could not add that person.'),
            });
          },
        },
      ],
    });
    await alert.present();
  }

  async editPerson(person: Participant): Promise<void> {
    const linked = !!person.core_user_ref;
    const alert = await this.alertCtrl.create({
      header: 'Edit cast member',
      message: linked
        ? 'Linked to an account. Enter a new email to re-link them.'
        : 'Enter an account email to identify this person in live sessions.',
      inputs: [
        { name: 'name', type: 'text', value: person.display_name, placeholder: 'Display name' },
        {
          name: 'email',
          type: 'email',
          placeholder: linked ? 'New account email' : 'Account email',
        },
      ],
      buttons: [
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.studio.deleteParticipant(person.id)
              .subscribe({ next: () => this.reload(), error: () => {} });
          },
        },
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: (data) => {
            const name = String(data?.name ?? '').trim();
            const email = String(data?.email ?? '').trim();
            const patch: { display_name?: string; email?: string } = {};
            if (name && name !== person.display_name) patch.display_name = name;
            if (email) patch.email = email;
            if (!patch.display_name && !patch.email) return;
            this.studio.updateParticipant(person.id, patch).subscribe({
              next: () => this.reload(),
              error: (err) => this.showError(err, 'Could not update that person.'),
            });
          },
        },
      ],
    });
    await alert.present();
  }

  /** Surface a worker validation error (e.g. an unknown email) as a toast. */
  private async showError(err: unknown, fallback: string): Promise<void> {
    const detail = (err as { error?: { error?: string; message?: string } } | null)?.error;
    const toast = await this.toastCtrl.create({
      message: detail?.error || detail?.message || fallback,
      duration: 2600,
      position: 'bottom',
    });
    await toast.present();
  }

  // ── Sections ─────────────────────────────────────────────────────────────────

  addSection(): void {
    this.studio.addSection(this.episodeId, { heading: 'New Section', type: 'custom' })
      .subscribe({ next: () => this.reload(), error: () => {} });
  }

  onSectionHeadingBlur(section: Section, ev: Event): void {
    const heading = this.elValue(ev).trim();
    if (!heading) return;
    this.patchSectionLocal(section.id, { heading });
    this.studio.updateSection(section.id, { heading }).subscribe({ error: () => {} });
  }

  async deleteSection(section: Section): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Delete section?',
      message: `"${section.heading}" and its talking points will be removed.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.studio.deleteSection(section.id)
              .subscribe({ next: () => this.reload(), error: () => {} });
          },
        },
      ],
    });
    await alert.present();
  }

  // ── Talking points ───────────────────────────────────────────────────────────

  addPoint(section: Section): void {
    this.studio.addPoint(section.id, { text: '' })
      .subscribe({ next: () => this.reload(), error: () => {} });
  }

  onPointTextBlur(section: Section, point: TalkingPoint, ev: Event): void {
    const text = this.elValue(ev);
    this.patchPointLocal(section.id, point.id, { text });
    this.studio.updatePoint(point.id, { text }).subscribe({ error: () => {} });
  }

  onPointSpeakerChange(section: Section, point: TalkingPoint, ev: Event): void {
    const value = this.selValue(ev);
    const speakerRef = value ? value : null;
    this.patchPointLocal(section.id, point.id, { speaker_ref: speakerRef });
    this.studio.updatePoint(point.id, { speaker_ref: speakerRef }).subscribe({ error: () => {} });
  }

  onPointBridgeBlur(section: Section, point: TalkingPoint, ev: Event): void {
    const bridge = this.elValue(ev);
    this.patchPointLocal(section.id, point.id, { bridge });
    this.studio.updatePoint(point.id, { bridge }).subscribe({ error: () => {} });
  }

  onPointEstBlur(section: Section, point: TalkingPoint, ev: Event): void {
    const raw = this.elValue(ev).trim();
    const est = raw ? Math.max(0, Math.round(Number(raw))) : null;
    if (est !== null && !Number.isFinite(est)) return;
    this.patchPointLocal(section.id, point.id, { est_seconds: est });
    this.studio.updatePoint(point.id, { est_seconds: est }).subscribe({ error: () => {} });
  }

  deletePoint(section: Section, point: TalkingPoint): void {
    this.studio.deletePoint(point.id)
      .subscribe({ next: () => this.reload(), error: () => {} });
  }

  // ── Episode delete + live stub ───────────────────────────────────────────────

  async deleteEpisode(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Delete episode?',
      message: 'This removes the episode and all of its sections and talking points.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.studio.deleteEpisode(this.episodeId).subscribe({
              next: () => this.router.navigate(['/studio']),
              error: () => {},
            });
          },
        },
      ],
    });
    await alert.present();
  }

  async saveAsTemplate(): Promise<void> {
    const ep = this.episode();
    if (!ep) return;
    const alert = await this.alertCtrl.create({
      header: 'Save as template',
      message: 'Reuse this episode structure for future episodes.',
      inputs: [{ name: 'name', type: 'text', value: ep.title, placeholder: 'Template name' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: (data) => {
            const name = String(data?.name ?? '').trim();
            if (name) this.commitTemplate(ep, name);
          },
        },
      ],
    });
    await alert.present();
  }

  private commitTemplate(ep: EpisodeAggregate, name: string): void {
    this.studio
      .createTemplate({ name, format: ep.format, structure: this.buildStructure(ep) })
      .subscribe({
        next: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Template saved.', duration: 1800, position: 'bottom',
          });
          await toast.present();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Could not save the template.', duration: 2000, position: 'bottom',
          });
          await toast.present();
        },
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

  startSession(): void {
    this.studio.startSession(this.episodeId).subscribe({
      next: (session) => this.router.navigate(['/studio/session', session.room_code]),
      error: async () => {
        const toast = await this.toastCtrl.create({
          message: 'Could not start the live session.',
          duration: 2200,
          position: 'bottom',
        });
        await toast.present();
      },
    });
  }

  /** Talking head: open the local swipe-through prompter for recording. */
  record(): void {
    this.router.navigate(['/studio/record', this.episodeId]);
  }

  // ── Local state helpers ──────────────────────────────────────────────────────

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

  private elValue(ev: Event): string {
    const target = ev.target as unknown as { value?: string | null } | null;
    return (target?.value ?? '').toString();
  }

  private selValue(ev: Event): string {
    const detail = (ev as CustomEvent).detail as { value?: unknown } | undefined;
    return detail?.value != null ? String(detail.value) : '';
  }
}
