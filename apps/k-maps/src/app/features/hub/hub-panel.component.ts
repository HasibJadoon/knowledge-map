import {
  Component, ChangeDetectionStrategy, inject, effect, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HubPanelService } from './hub-panel.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'km-hub-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hub-panel.component.html',
  styleUrl: './hub-panel.component.scss'
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
      'wv-worldview': `${environment.apiBase}/wv/worldviews`,
      'wv-topic': `${environment.apiBase}/wv/topics`,
      'wv-source': `${environment.apiBase}/wv/sources`,
      'wv-person': `${environment.apiBase}/wv/people`,
      'ar-balagha': `${environment.apiBase}/ar/balagha`,
      'ar-domain': `${environment.apiBase}/ar/domains`,
      'wv-podcast': `${environment.apiBase}/wv/podcasts`,
      'wv-plan': `${environment.apiBase}/wv/plans`,
      'ar-container': `${environment.apiBase}/ar/containers`,
      'workspace': `${environment.apiBase}/workspaces`
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
