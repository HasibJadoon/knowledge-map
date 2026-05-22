import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, IonicModule, ToastController } from '@ionic/angular';
import { StudioApiService } from '../../services/studio-api.service';
import {
  EPISODE_FORMATS, EpisodeAggregate, EpisodeFormat, Participant, Section, TalkingPoint,
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
          <ion-button (click)="startSession()" fill="clear" aria-label="Start live session">
            <ion-icon slot="icon-only" name="radio-outline"></ion-icon>
          </ion-button>
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

        <div class="km-ep-block">
          <div class="km-ep-block-head">Cast</div>
          <div class="km-ep-cast">
            @for (p of ep.participants; track p.id) {
              <button class="km-chip" (click)="editPerson(p)">
                <span class="km-chip-dot" [style.background]="p.color"></span>
                {{ p.display_name }}
              </button>
            }
            <button class="km-chip km-chip--add" (click)="addPerson()">+ Person</button>
          </div>
        </div>

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
                              placeholder="Talking point…" [value]="point.text"
                              (ionBlur)="onPointTextBlur(section, point, $event)"></ion-textarea>
                <div class="km-pt-foot">
                  <ion-select class="km-pt-speaker" interface="popover" placeholder="Anyone"
                              [value]="point.speaker_ref ?? ''"
                              (ionChange)="onPointSpeakerChange(section, point, $event)">
                    <ion-select-option value="">Anyone</ion-select-option>
                    @for (p of ep.participants; track p.id) {
                      <ion-select-option [value]="p.id">{{ p.display_name }}</ion-select-option>
                    }
                  </ion-select>
                  <ion-button fill="clear" size="small" color="medium"
                              (click)="deletePoint(section, point)">
                    <ion-icon slot="icon-only" name="close-outline"></ion-icon>
                  </ion-button>
                </div>
              </div>
            }

            <button class="km-add-row" (click)="addPoint(section)">+ Talking point</button>
          </ion-card>
        }

        <button class="km-add-section" (click)="addSection()">+ Add section</button>

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
      padding: 6px 12px; border-radius: 16px; font-size: 0.82rem;
      background: rgba(255,255,255,0.06); color: var(--ion-text-color);
      border: 1px solid rgba(255,255,255,0.08);
    }
    .km-chip-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
    .km-chip--add { color: #c9a84c; border-style: dashed; }

    .km-sec { margin: 12px 12px; border-radius: 12px; }
    .km-sec-head { display: flex; align-items: center; padding: 8px 6px 0 14px; }
    .km-sec-heading {
      flex: 1; background: transparent; border: none; outline: none;
      color: var(--ion-text-color); font-size: 0.98rem; font-weight: 600;
    }
    .km-sec-type {
      padding: 0 14px 8px; font-size: 0.64rem; font-weight: 700;
      letter-spacing: 0.08em; text-transform: uppercase; color: #c9a84c;
    }

    .km-pt {
      margin: 0 10px 8px; padding: 6px 8px;
      background: rgba(255,255,255,0.03); border-radius: 9px;
    }
    .km-pt-text { --padding-start: 6px; --padding-end: 6px; font-size: 0.9rem; }
    .km-pt-foot { display: flex; align-items: center; justify-content: space-between; }
    .km-pt-speaker {
      font-size: 0.76rem; --padding-start: 6px; max-width: 70%;
      color: var(--ion-color-medium);
    }

    .km-add-row {
      margin: 2px 12px 12px; padding: 8px; width: calc(100% - 24px);
      background: transparent; border: 1px dashed rgba(255,255,255,0.14);
      border-radius: 8px; color: #c9a84c; font-size: 0.82rem;
    }
    .km-add-section {
      display: block; margin: 8px 12px 4px; padding: 12px; width: calc(100% - 24px);
      background: rgba(201,168,76,0.1); border: none; border-radius: 10px;
      color: #c9a84c; font-size: 0.88rem; font-weight: 600;
    }
    .km-ep-danger { padding: 12px 12px 40px; }
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
      header: 'Add person',
      inputs: [{ name: 'name', type: 'text', placeholder: 'Name' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Add',
          handler: (data) => {
            const name = String(data?.name ?? '').trim();
            if (name) {
              this.studio.addParticipant(this.episodeId, { display_name: name })
                .subscribe({ next: () => this.reload(), error: () => {} });
            }
          },
        },
      ],
    });
    await alert.present();
  }

  async editPerson(person: Participant): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Edit person',
      inputs: [{ name: 'name', type: 'text', value: person.display_name, placeholder: 'Name' }],
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
            if (name && name !== person.display_name) {
              this.studio.updateParticipant(person.id, { display_name: name })
                .subscribe({ next: () => this.reload(), error: () => {} });
            }
          },
        },
      ],
    });
    await alert.present();
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
