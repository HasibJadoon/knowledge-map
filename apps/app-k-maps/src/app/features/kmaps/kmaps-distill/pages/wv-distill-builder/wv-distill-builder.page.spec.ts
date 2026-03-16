import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute, Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { of } from 'rxjs';

import { KmapsWorkflowService } from '../../../../../shared/services/kmaps-workflow.service';
import { WvDistillService } from '../../../../../shared/services/wv-distill.service';
import { WvHighlightsService } from '../../../../../shared/services/wv-highlights.service';
import { WvNodesService } from '../../../../../shared/services/wv-nodes.service';
import { WvNotesService } from '../../../../../shared/services/wv-notes.service';
import { WorldviewApiService } from '../../../../../shared/services/worldview-api.service';
import { type KmapsNote, type KmapsSource, type KmapsSourceUnit } from '../../../kmaps-shared/models/kmaps.models';
import { WvDistillBuilderPage } from './wv-distill-builder.page';

describe('WvDistillBuilderPage', () => {
  it('disables the footer action when an existing batch already hydrates as completed', async () => {
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
      title: 'Unit One',
      orderIndex: 0,
      startRef: null,
      endRef: null,
      locatorLabel: '12:6',
      anchorText: null,
      summary: null,
      readingMinutes: 0,
      readingBody: [],
      unitJson: null,
      metaJson: null,
      createdAt: '2026-03-16T00:00:00Z',
      updatedAt: null,
    };
    const highlight: KmapsNote = {
      id: 'note-1',
      canonicalInput: 'wv_note|highlight|note-1',
      userId: 1,
      sourceId: source.id,
      sourceUnitId: unit.id,
      noteKind: 'highlight',
      title: 'Highlight',
      bodyMd: 'Arabic note text',
      excerptText: 'Arabic note text',
      locator: '12:6',
      status: 'active',
      noteJson: null,
      metaJson: null,
      createdAt: '2026-03-16T00:00:00Z',
      updatedAt: null,
    };
    const fetchDistillBatch = jasmine.createSpy('fetchDistillBatch').and.returnValue(of({
      batch: {
        id: 'batch-1',
        unitId: unit.id,
        sourceId: source.id,
        batchType: 'distill' as const,
        workspaceId: 'ws_worldview' as const,
        status: 'completed' as const,
        createdAt: '2026-03-16T00:00:00Z',
        updatedAt: '2026-03-16T00:00:00Z',
      },
      items: [
        {
          id: 'item-1',
          batchId: 'batch-1',
          noteId: highlight.id,
          role: 'evidence' as const,
          selected: true,
          createdAt: '2026-03-16T00:00:00Z',
          updatedAt: '2026-03-16T00:00:00Z',
        },
      ],
      suggestions: [
        {
          id: 'suggestion-1',
          batchId: 'batch-1',
          kind: 'concept' as const,
          title: 'Existing suggestion',
          summary: 'Already generated.',
          relationType: null,
          sourceNoteIds: [highlight.id],
          status: 'draft' as const,
          createdAt: '2026-03-16T00:00:00Z',
          updatedAt: '2026-03-16T00:00:00Z',
        },
      ],
      decisions: [],
      draftOutput: null,
      promptVersion: null,
      model: null,
    }));

    TestBed.configureTestingModule({
      imports: [WvDistillBuilderPage],
      providers: [
        WvDistillService,
        WvNodesService,
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ batchId: 'batch-1' })) },
        },
        {
          provide: Router,
          useValue: {
            url: '/worldview/distill/batch/batch-1',
            navigate: jasmine.createSpy('navigate'),
          },
        },
        {
          provide: KmapsWorkflowService,
          useValue: {
            getSource: (sourceId: string) => (sourceId === source.id ? source : null),
            getUnit: (unitId: string) => (unitId === unit.id ? unit : null),
          },
        },
        {
          provide: WvHighlightsService,
          useValue: {
            listForUnit: (sourceId: string, unitId: string) =>
              sourceId === source.id && unitId === unit.id ? [highlight] : [],
          },
        },
        {
          provide: WvNotesService,
          useValue: {
            listForUnit: () => [],
          },
        },
        {
          provide: WorldviewApiService,
          useValue: {
            fetchDistillBatch,
            generateDistillBatch: jasmine.createSpy('generateDistillBatch'),
          },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    });
    TestBed.overrideProvider(ModalController, {
      useValue: {
        create: jasmine.createSpy('create'),
      },
    });
    await TestBed.compileComponents();

    const fixture = TestBed.createComponent(WvDistillBuilderPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const host: HTMLElement = fixture.nativeElement;
    const ctaButton = host.querySelector('.wv-distill-builder__cta') as HTMLIonButtonElement | null;

    expect(fetchDistillBatch).toHaveBeenCalledWith('batch-1');
    expect(component.canGenerateBatch()).toBeFalse();
    expect(component.footerActionDisabled()).toBeTrue();
    expect(host.textContent).toContain('Suggestions Generated');
    expect(component.selectAllDisabled()).toBeTrue();
    expect(ctaButton?.disabled).toBeTrue();
  });
});
