import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { KmapsWorkflowService } from '../../../../../shared/services/kmaps-workflow.service';
import { WvDistillService } from '../../../../../shared/services/wv-distill.service';
import { WvHighlightsService } from '../../../../../shared/services/wv-highlights.service';
import { WvNotesService } from '../../../../../shared/services/wv-notes.service';
import { WorldviewApiService } from '../../../../../shared/services/worldview-api.service';
import { type KmapsNote, type KmapsSource, type KmapsSourceUnit } from '../../../kmaps-shared/models/kmaps.models';
import { WvDistillStartPage } from './wv-distill-start.page';

describe('WvDistillStartPage', () => {
  it('creates a fresh draft from a completed batch and shows Resume afterwards', async () => {
    const source: KmapsSource = {
      id: 'source-1',
      canonicalInput: 'wv_source|book|source-1',
      userId: 1,
      sourceType: 'book',
      title: 'Quran',
      subtitle: null,
      creator: null,
      publisher: null,
      publicationYear: null,
      language: 'Arabic',
      sourceUrl: null,
      sourceRef: null,
      status: 'active',
      description: '',
      progressPercent: 0,
      lastOpenedAt: '2026-03-16T00:00:00Z',
      sourceJson: null,
      metaJson: null,
      createdAt: '2026-03-16T00:00:00Z',
      updatedAt: null,
    };
    const unit: KmapsSourceUnit = {
      id: 'unit-1',
      canonicalInput: 'wv_unit|chapter|unit-1',
      sourceId: source.id,
      parentUnitId: null,
      unitType: 'chapter',
      title: 'Passage 1',
      orderIndex: 0,
      startRef: '1',
      endRef: '7',
      locatorLabel: '1-7',
      anchorText: null,
      summary: null,
      readingMinutes: 3,
      readingBody: [],
      unitJson: null,
      metaJson: null,
      createdAt: '2026-03-16T00:00:00Z',
      updatedAt: null,
    };
    const note: KmapsNote = {
      id: 'note-1',
      canonicalInput: 'wv_note|reflection|note-1',
      userId: 1,
      sourceId: source.id,
      sourceUnitId: unit.id,
      noteKind: 'reflection',
      title: 'Reflection',
      bodyMd: 'Saved note',
      excerptText: 'Saved note',
      locator: '1:1',
      status: 'active',
      noteJson: null,
      metaJson: null,
      createdAt: '2026-03-16T00:00:00Z',
      updatedAt: null,
    };
    const routerNavigate = jasmine.createSpy('navigate');

    TestBed.configureTestingModule({
      imports: [WvDistillStartPage],
      providers: [
        WvDistillService,
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ unitId: unit.id })) },
        },
        {
          provide: Router,
          useValue: {
            url: `/worldview/distill/start/${unit.id}`,
            navigate: routerNavigate,
          },
        },
        {
          provide: KmapsWorkflowService,
          useValue: {
            getUnit: (unitId: string) => (unitId === unit.id ? unit : null),
            getSource: (sourceId: string) => (sourceId === source.id ? source : null),
          },
        },
        {
          provide: WvNotesService,
          useValue: {
            listForUnit: () => [note],
          },
        },
        {
          provide: WvHighlightsService,
          useValue: {
            listForUnit: () => [],
          },
        },
        {
          provide: WorldviewApiService,
          useValue: {
            fetchDistillBatchForUnit: () =>
              of({
                batch: {
                  id: 'batch-completed',
                  unitId: unit.id,
                  sourceId: source.id,
                  batchType: 'distill' as const,
                  workspaceId: 'ws_worldview' as const,
                  status: 'completed' as const,
                  createdAt: '2026-03-16T00:00:00Z',
                  updatedAt: '2026-03-16T00:00:00Z',
                },
                items: [],
                suggestions: [],
                decisions: [],
                draftOutput: null,
                promptVersion: null,
                model: null,
              }),
          },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    });
    await TestBed.compileComponents();

    const fixture = TestBed.createComponent(WvDistillStartPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.distillLocked()).toBeFalse();
    expect(component.actionLabel()).toBe('Start Distill');

    component.startDistill();
    fixture.detectChanges();

    expect(component.localBatchStatus()).toBe('draft');
    expect(component.actionLabel()).toBe('Resume');
    expect(routerNavigate).toHaveBeenCalledWith(['/worldview', 'distill', 'batch', component.localBatch()!.id]);
  });
});
