import {
  Component, ChangeDetectionStrategy, inject, effect, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HubPanelService } from './hub-panel.service';

@Component({
  selector: 'km-hub-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="hp-overlay" [class.hp-overlay--open]="panel.isOpen()" (click)="panel.close()"></div>

    <aside class="hp" [class.hp--open]="panel.isOpen()" role="dialog" [attr.aria-label]="panel.state().title">

      <!-- Header -->
      <div class="hp__header">
        <div class="hp__title-row">
          <span class="hp__mode-tag">{{ panel.state().mode | uppercase }}</span>
          <h2 class="hp__title">{{ panel.state().title }}</h2>
        </div>
        <button class="hp__close" (click)="panel.close()" aria-label="Close panel">✕</button>
      </div>

      <!-- Body — dynamic form per mode -->
      <div class="hp__body">

        <!-- WORLDVIEW -->
        @if (panel.mode() === 'wv-worldview') {
          <form [formGroup]="wvWorldviewForm" (ngSubmit)="submit('wv-worldview')" class="hp__form">
            <label class="hp__field">
              <span>Name</span>
              <input formControlName="name" placeholder="e.g. Islam" />
            </label>
            <label class="hp__field">
              <span>Type</span>
              <select formControlName="type">
                <option value="religion">Religion</option>
                <option value="philosophy">Philosophy</option>
                <option value="ideology">Ideology</option>
                <option value="branch">Branch / Sect</option>
              </select>
            </label>
            <label class="hp__field">
              <span>Description</span>
              <textarea formControlName="description" rows="3" placeholder="Brief overview…"></textarea>
            </label>
            <label class="hp__field">
              <span>Icon</span>
              <input formControlName="icon" placeholder="Emoji or symbol" />
            </label>
            <div class="hp__actions">
              <button type="submit" class="hp__btn hp__btn--primary" [disabled]="wvWorldviewForm.invalid">Save</button>
              <button type="button" class="hp__btn" (click)="panel.close()">Cancel</button>
            </div>
          </form>
        }

        <!-- TOPIC -->
        @if (panel.mode() === 'wv-topic') {
          <form [formGroup]="wvTopicForm" (ngSubmit)="submit('wv-topic')" class="hp__form">
            <label class="hp__field">
              <span>Topic Name</span>
              <input formControlName="name" placeholder="e.g. Creation of the Universe" />
            </label>
            <label class="hp__field">
              <span>Description</span>
              <textarea formControlName="description" rows="3" placeholder="What is this topic about?"></textarea>
            </label>
            <label class="hp__field">
              <span>Tags (comma-separated)</span>
              <input formControlName="tags" placeholder="theology, cosmology" />
            </label>
            <div class="hp__actions">
              <button type="submit" class="hp__btn hp__btn--primary" [disabled]="wvTopicForm.invalid">Save</button>
              <button type="button" class="hp__btn" (click)="panel.close()">Cancel</button>
            </div>
          </form>
        }

        <!-- SOURCE (wv_sources) -->
        @if (panel.mode() === 'wv-source') {
          <form [formGroup]="wvSourceForm" (ngSubmit)="submit('wv-source')" class="hp__form">
            <label class="hp__field">
              <span>Title</span>
              <input formControlName="title" placeholder="Book or article title" />
            </label>
            <label class="hp__field">
              <span>Author</span>
              <input formControlName="author" placeholder="Author name" />
            </label>
            <label class="hp__field">
              <span>Type</span>
              <select formControlName="source_type">
                <option value="book">Book</option>
                <option value="article">Article</option>
                <option value="podcast">Podcast</option>
                <option value="video">Video</option>
                <option value="paper">Academic Paper</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label class="hp__field">
              <span>Publication Year</span>
              <input formControlName="year" type="number" placeholder="e.g. 2023" />
            </label>
            <label class="hp__field">
              <span>Language</span>
              <select formControlName="language">
                <option value="en">English</option>
                <option value="ar">Arabic</option>
                <option value="both">Both</option>
              </select>
            </label>
            <div class="hp__actions">
              <button type="submit" class="hp__btn hp__btn--primary" [disabled]="wvSourceForm.invalid">Save</button>
              <button type="button" class="hp__btn" (click)="panel.close()">Cancel</button>
            </div>
          </form>
        }

        <!-- PERSON (wv_person) -->
        @if (panel.mode() === 'wv-person') {
          <form [formGroup]="wvPersonForm" (ngSubmit)="submit('wv-person')" class="hp__form">
            <label class="hp__field">
              <span>Full Name</span>
              <input formControlName="name" placeholder="Name" />
            </label>
            <label class="hp__field">
              <span>Nickname</span>
              <input formControlName="nickname" placeholder="Optional nickname" />
            </label>
            <label class="hp__field">
              <span>Relationship</span>
              <select formControlName="relationship">
                <option value="family">Family</option>
                <option value="friend">Friend</option>
                <option value="colleague">Colleague</option>
                <option value="mentor">Mentor</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label class="hp__field">
              <span>Family Role</span>
              <input formControlName="family_role" placeholder="e.g. Father, Brother (if family)" />
            </label>
            <label class="hp__field">
              <span>Visibility</span>
              <select formControlName="visibility">
                <option value="private">Private (Family — never shared)</option>
                <option value="workspace">Workspace (Friends/Colleagues)</option>
              </select>
            </label>
            <label class="hp__field">
              <span>Bio</span>
              <textarea formControlName="bio" rows="3" placeholder="Brief description…"></textarea>
            </label>
            <div class="hp__actions">
              <button type="submit" class="hp__btn hp__btn--primary" [disabled]="wvPersonForm.invalid">Save</button>
              <button type="button" class="hp__btn" (click)="panel.close()">Cancel</button>
            </div>
          </form>
        }

        <!-- BALAGHA -->
        @if (panel.mode() === 'ar-balagha') {
          <form [formGroup]="arBalaghaForm" (ngSubmit)="submit('ar-balagha')" class="hp__form">
            <label class="hp__field">
              <span>Term (Arabic)</span>
              <input formControlName="term_ar" class="rtl" placeholder="الاستعارة" dir="rtl" />
            </label>
            <label class="hp__field">
              <span>Term (English)</span>
              <input formControlName="term_en" placeholder="Metaphor" />
            </label>
            <label class="hp__field">
              <span>Branch</span>
              <select formControlName="branch">
                <option value="bayan">علم البيان — Bayan (Figures of Speech)</option>
                <option value="maani">علم المعاني — Maani (Semantics)</option>
                <option value="badi">علم البديع — Badi (Ornamentation)</option>
              </select>
            </label>
            <label class="hp__field">
              <span>Definition</span>
              <textarea formControlName="definition" rows="4" placeholder="Explain the rhetorical device…"></textarea>
            </label>
            <label class="hp__field">
              <span>Quran References (comma-separated Surah:Ayah)</span>
              <input formControlName="quran_refs" placeholder="2:255, 36:40" />
            </label>
            <div class="hp__actions">
              <button type="submit" class="hp__btn hp__btn--primary" [disabled]="arBalaghaForm.invalid">Save</button>
              <button type="button" class="hp__btn" (click)="panel.close()">Cancel</button>
            </div>
          </form>
        }

        <!-- DOMAIN -->
        @if (panel.mode() === 'ar-domain') {
          <form [formGroup]="arDomainForm" (ngSubmit)="submit('ar-domain')" class="hp__form">
            <label class="hp__field">
              <span>Domain Name (English)</span>
              <input formControlName="name" placeholder="e.g. home" />
            </label>
            <label class="hp__field">
              <span>Domain Name (Arabic)</span>
              <input formControlName="name_ar" class="rtl" dir="rtl" placeholder="البيت" />
            </label>
            <label class="hp__field">
              <span>Description</span>
              <textarea formControlName="description" rows="2" placeholder="Context description…"></textarea>
            </label>
            <label class="hp__field">
              <span>Icon (emoji)</span>
              <input formControlName="icon" placeholder="🏠" />
            </label>
            <div class="hp__actions">
              <button type="submit" class="hp__btn hp__btn--primary" [disabled]="arDomainForm.invalid">Save</button>
              <button type="button" class="hp__btn" (click)="panel.close()">Cancel</button>
            </div>
          </form>
        }

        <!-- PODCAST -->
        @if (panel.mode() === 'wv-podcast') {
          <form [formGroup]="wvPodcastForm" (ngSubmit)="submit('wv-podcast')" class="hp__form">
            <label class="hp__field">
              <span>Title</span>
              <input formControlName="title" placeholder="Episode title" />
            </label>
            <label class="hp__field">
              <span>Type</span>
              <select formControlName="type">
                <option value="solo">Solo</option>
                <option value="interview">Interview</option>
                <option value="panel">Panel Discussion</option>
              </select>
            </label>
            <label class="hp__field">
              <span>Description</span>
              <textarea formControlName="description" rows="3" placeholder="What is this episode about?"></textarea>
            </label>
            <label class="hp__field">
              <span>Status</span>
              <select formControlName="status">
                <option value="planning">Planning</option>
                <option value="in_progress">In Progress</option>
                <option value="recorded">Recorded</option>
                <option value="published">Published</option>
              </select>
            </label>
            <div class="hp__actions">
              <button type="submit" class="hp__btn hp__btn--primary" [disabled]="wvPodcastForm.invalid">Save</button>
              <button type="button" class="hp__btn" (click)="panel.close()">Cancel</button>
            </div>
          </form>
        }

        <!-- PLAN -->
        @if (panel.mode() === 'wv-plan') {
          <form [formGroup]="wvPlanForm" (ngSubmit)="submit('wv-plan')" class="hp__form">
            <label class="hp__field">
              <span>Plan Title</span>
              <input formControlName="title" placeholder="e.g. Q2 Reading Plan" />
            </label>
            <label class="hp__field">
              <span>Type</span>
              <select formControlName="type">
                <option value="reading">Reading</option>
                <option value="research">Research</option>
                <option value="memorisation">Memorisation</option>
                <option value="mixed">Mixed</option>
              </select>
            </label>
            <label class="hp__field">
              <span>Start Date</span>
              <input formControlName="start_date" type="date" />
            </label>
            <label class="hp__field">
              <span>End Date</span>
              <input formControlName="end_date" type="date" />
            </label>
            <label class="hp__field">
              <span>Description</span>
              <textarea formControlName="description" rows="3" placeholder="Goals and scope…"></textarea>
            </label>
            <div class="hp__actions">
              <button type="submit" class="hp__btn hp__btn--primary" [disabled]="wvPlanForm.invalid">Save</button>
              <button type="button" class="hp__btn" (click)="panel.close()">Cancel</button>
            </div>
          </form>
        }

        <!-- AR CONTAINER -->
        @if (panel.mode() === 'ar-container') {
          <form [formGroup]="arContainerForm" (ngSubmit)="submit('ar-container')" class="hp__form">
            <label class="hp__field">
              <span>Title</span>
              <input formControlName="title" placeholder="Book or podcast title" />
            </label>
            <label class="hp__field">
              <span>Type</span>
              <select formControlName="type">
                <option value="book">Book</option>
                <option value="podcast">Podcast</option>
                <option value="poetry">Poetry Collection</option>
                <option value="article">Article Series</option>
                <option value="course">Course</option>
              </select>
            </label>
            <label class="hp__field">
              <span>Level</span>
              <select formControlName="level">
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="classical">Classical</option>
              </select>
            </label>
            <label class="hp__field">
              <span>Author / Source</span>
              <input formControlName="author" placeholder="Author name" />
            </label>
            <label class="hp__field">
              <span>Description</span>
              <textarea formControlName="description" rows="3" placeholder="Overview of this material…"></textarea>
            </label>
            <div class="hp__actions">
              <button type="submit" class="hp__btn hp__btn--primary" [disabled]="arContainerForm.invalid">Save</button>
              <button type="button" class="hp__btn" (click)="panel.close()">Cancel</button>
            </div>
          </form>
        }

        <!-- WORKSPACE -->
        @if (panel.mode() === 'workspace') {
          <form [formGroup]="workspaceForm" (ngSubmit)="submit('workspace')" class="hp__form">
            <label class="hp__field">
              <span>Workspace Name</span>
              <input formControlName="name" placeholder="e.g. Quran Research Project" />
            </label>
            <label class="hp__field">
              <span>Description</span>
              <textarea formControlName="description" rows="3" placeholder="What is this workspace for?"></textarea>
            </label>
            <label class="hp__field">
              <span>Type</span>
              <select formControlName="type">
                <option value="research">Research</option>
                <option value="podcast">Podcast Production</option>
                <option value="study">Study Group</option>
                <option value="personal">Personal</option>
              </select>
            </label>
            <div class="hp__actions">
              <button type="submit" class="hp__btn hp__btn--primary" [disabled]="workspaceForm.invalid">Save</button>
              <button type="button" class="hp__btn" (click)="panel.close()">Cancel</button>
            </div>
          </form>
        }

        <!-- GENERIC fallback -->
        @if (!knownModes.includes(panel.mode())) {
          <div class="hp__empty">
            <span class="hp__empty-icon">⚙️</span>
            <p>Form for <strong>{{ panel.mode() }}</strong> coming soon.</p>
          </div>
        }

      </div>

      <!-- Status bar -->
      @if (saveStatus() !== 'idle') {
        <div class="hp__status" [class.hp__status--ok]="saveStatus() === 'ok'" [class.hp__status--err]="saveStatus() === 'err'">
          @if (saveStatus() === 'saving') { <span>Saving…</span> }
          @if (saveStatus() === 'ok') { <span>✓ Saved</span> }
          @if (saveStatus() === 'err') { <span>✕ Save failed</span> }
        </div>
      }
    </aside>
  `,
  styles: [`
    .hp-overlay {
      position: fixed; inset: 0; z-index: 198;
      background: rgba(0,0,0,0);
      pointer-events: none;
      transition: background .3s;
      &--open { background: rgba(0,0,0,.45); pointer-events: all; }
    }

    .hp {
      position: fixed; top: 0; right: 0; bottom: 0;
      width: min(480px, 100vw);
      z-index: 199;
      background: #0c0c0c;
      border-left: 1px solid rgba(255,255,255,.08);
      display: flex; flex-direction: column;
      transform: translateX(100%);
      transition: transform .35s cubic-bezier(.4,0,.2,1);
      overflow: hidden;

      &--open { transform: translateX(0); }
    }

    .hp__header {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 1.5rem 1.5rem 1rem;
      border-bottom: 1px solid rgba(255,255,255,.06);
      flex-shrink: 0;
    }

    .hp__title-row { display: flex; flex-direction: column; gap: .3rem; }

    .hp__mode-tag {
      font-size: .58rem; font-weight: 700; letter-spacing: .2em;
      color: var(--km-gold); opacity: .6;
    }

    .hp__title {
      font-family: var(--km-font-heading);
      font-size: 1.1rem; font-weight: 600;
      color: var(--km-text); margin: 0;
    }

    .hp__close {
      background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1);
      border-radius: 8px; color: var(--km-text-3);
      width: 32px; height: 32px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: .9rem; flex-shrink: 0;
      transition: background .2s, border-color .2s, color .2s;
      &:hover { background: rgba(255,255,255,.1); color: var(--km-text); border-color: rgba(255,255,255,.2); }
    }

    .hp__body {
      flex: 1; overflow-y: auto; padding: 1.5rem;
      &::-webkit-scrollbar { width: 4px; }
      &::-webkit-scrollbar-track { background: transparent; }
      &::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 2px; }
    }

    .hp__form { display: flex; flex-direction: column; gap: 1.1rem; }

    .hp__field {
      display: flex; flex-direction: column; gap: .4rem;

      span {
        font-size: .72rem; font-weight: 600; letter-spacing: .06em;
        color: var(--km-text-3); text-transform: uppercase;
      }

      input, select, textarea {
        background: rgba(255,255,255,.04);
        border: 1px solid rgba(255,255,255,.1);
        border-radius: 8px; color: var(--km-text);
        font-family: var(--km-font-body); font-size: .88rem;
        padding: .65rem .9rem; width: 100%; outline: none;
        transition: border-color .2s;

        &:focus { border-color: rgba(201,168,76,.5); }
        &::placeholder { color: var(--km-text-3); opacity: .5; }
        &.rtl { font-family: var(--km-font-arabic, inherit); font-size: 1rem; text-align: right; }
      }

      textarea { resize: vertical; }
    }

    .hp__actions {
      display: flex; gap: .75rem; margin-top: .5rem;
    }

    .hp__btn {
      flex: 1; padding: .7rem 1.2rem; border-radius: 8px;
      font-family: var(--km-font-body); font-size: .82rem; font-weight: 600;
      letter-spacing: .06em; cursor: pointer;
      border: 1px solid rgba(255,255,255,.1);
      background: rgba(255,255,255,.05); color: var(--km-text-2);
      transition: background .2s, border-color .2s, color .2s;
      &:hover { background: rgba(255,255,255,.1); color: var(--km-text); }
      &--primary {
        background: rgba(201,168,76,.15);
        border-color: rgba(201,168,76,.35); color: var(--km-gold);
        &:hover { background: rgba(201,168,76,.25); }
        &:disabled { opacity: .4; cursor: not-allowed; }
      }
    }

    .hp__empty {
      display: flex; flex-direction: column; align-items: center;
      gap: 1rem; padding: 3rem 1rem; text-align: center;
      color: var(--km-text-3);
      .hp__empty-icon { font-size: 2.5rem; opacity: .4; }
      p { font-size: .88rem; line-height: 1.6; }
    }

    .hp__status {
      padding: .75rem 1.5rem; flex-shrink: 0; font-size: .8rem; font-weight: 600;
      border-top: 1px solid rgba(255,255,255,.06);
      color: var(--km-text-3);
      &--ok { color: #4caf7a; }
      &--err { color: #e05c5c; }
    }
  `]
})
export class HubPanelComponent {
  readonly panel = inject(HubPanelService);
  private fb = inject(FormBuilder);

  readonly saveStatus = signal<'idle' | 'saving' | 'ok' | 'err'>('idle');

  constructor() {
    effect(() => {
      if (!this.panel.isOpen()) {
        this.saveStatus.set('idle');
      }
    });
  }

  readonly knownModes = [
    'wv-worldview', 'wv-topic', 'wv-source', 'wv-person',
    'ar-balagha', 'ar-domain', 'wv-podcast', 'wv-plan',
    'ar-container', 'workspace'
  ];

  wvWorldviewForm = this.fb.group({
    name: ['', Validators.required],
    type: ['religion', Validators.required],
    description: [''],
    icon: ['']
  });

  wvTopicForm = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    tags: ['']
  });

  wvSourceForm = this.fb.group({
    title: ['', Validators.required],
    author: [''],
    source_type: ['book'],
    year: [null],
    language: ['en']
  });

  wvPersonForm = this.fb.group({
    name: ['', Validators.required],
    nickname: [''],
    relationship: ['family', Validators.required],
    family_role: [''],
    visibility: ['private', Validators.required],
    bio: ['']
  });

  arBalaghaForm = this.fb.group({
    term_ar: ['', Validators.required],
    term_en: ['', Validators.required],
    branch: ['bayan', Validators.required],
    definition: ['', Validators.required],
    quran_refs: ['']
  });

  arDomainForm = this.fb.group({
    name: ['', Validators.required],
    name_ar: ['', Validators.required],
    description: [''],
    icon: ['']
  });

  wvPodcastForm = this.fb.group({
    title: ['', Validators.required],
    type: ['solo'],
    description: [''],
    status: ['planning']
  });

  wvPlanForm = this.fb.group({
    title: ['', Validators.required],
    type: ['reading'],
    start_date: ['', Validators.required],
    end_date: [''],
    description: ['']
  });

  arContainerForm = this.fb.group({
    title: ['', Validators.required],
    type: ['book'],
    level: ['intermediate'],
    author: [''],
    description: ['']
  });

  workspaceForm = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    type: ['research']
  });

  async submit(mode: string): Promise<void> {
    this.saveStatus.set('saving');

    const formMap: Record<string, any> = {
      'wv-worldview': this.wvWorldviewForm,
      'wv-topic': this.wvTopicForm,
      'wv-source': this.wvSourceForm,
      'wv-person': this.wvPersonForm,
      'ar-balagha': this.arBalaghaForm,
      'ar-domain': this.arDomainForm,
      'wv-podcast': this.wvPodcastForm,
      'wv-plan': this.wvPlanForm,
      'ar-container': this.arContainerForm,
      'workspace': this.workspaceForm
    };

    const endpointMap: Record<string, string> = {
      'wv-worldview': '/wv/worldviews',
      'wv-topic': '/wv/topics',
      'wv-source': '/wv/sources',
      'wv-person': '/wv/people',
      'ar-balagha': '/ar/balagha',
      'ar-domain': '/ar/domains',
      'wv-podcast': '/wv/podcasts',
      'wv-plan': '/wv/plans',
      'ar-container': '/ar/containers',
      'workspace': '/workspaces'
    };

    const form = formMap[mode];
    const endpoint = endpointMap[mode];
    if (!form || !endpoint) { this.saveStatus.set('err'); return; }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form.value)
      });
      const data = await res.json() as { ok: boolean };
      if (data.ok) {
        this.saveStatus.set('ok');
        form.reset();
        setTimeout(() => { this.panel.close(); this.saveStatus.set('idle'); }, 1200);
      } else {
        this.saveStatus.set('err');
      }
    } catch {
      this.saveStatus.set('err');
    }
  }
}
