import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute, Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { of } from 'rxjs';

import { KmapsWorkflowService } from '../../../../../shared/services/kmaps-workflow.service';
import { type KmapsSource, type KmapsSourceUnit } from '../../../kmaps-shared/models/kmaps.models';
import { SourceDetailPage } from './source-detail-page';

describe('SourceDetailPage', () => {
  it('does not render the generated output menu on source detail pages', async () => {
    const source: KmapsSource = {
      id: 'source-1',
      canonicalInput: 'wv_source|book|source-1',
      userId: 1,
      sourceType: 'book',
      title: 'Source One',
      subtitle: 'Reading copy',
      creator: 'Author One',
      publisher: 'Publisher',
      publicationYear: 2026,
      language: 'English',
      sourceUrl: null,
      sourceRef: 'Chapter 1',
      status: 'active',
      description: 'Source description.',
      progressPercent: 42,
      lastOpenedAt: '2026-03-16T00:00:00Z',
      sourceJson: { recentLocator: 'Chapter 1' },
      metaJson: null,
      createdAt: '2026-03-16T00:00:00Z',
      updatedAt: null,
    };
    const units: KmapsSourceUnit[] = [
      {
        id: 'unit-1',
        canonicalInput: 'wv_unit|chapter|unit-1',
        sourceId: source.id,
        parentUnitId: null,
        unitType: 'chapter',
        title: 'Chapter 1',
        orderIndex: 0,
        startRef: '1',
        endRef: '10',
        locatorLabel: 'Chapter 1',
        anchorText: null,
        summary: null,
        readingMinutes: 10,
        readingBody: [],
        unitJson: null,
        metaJson: null,
        createdAt: '2026-03-16T00:00:00Z',
        updatedAt: null,
      },
    ];

    TestBed.configureTestingModule({
      imports: [SourceDetailPage],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ sourceId: source.id })) },
        },
        {
          provide: Router,
          useValue: {
            url: `/worldview/sources/${source.id}`,
            events: of(),
            navigate: jasmine.createSpy('navigate'),
          },
        },
        {
          provide: KmapsWorkflowService,
          useValue: {
            getSource: (sourceId: string) => (sourceId === source.id ? source : null),
            getUnitsForSource: (sourceId: string) => (sourceId === source.id ? units : []),
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

    const fixture = TestBed.createComponent(SourceDetailPage);
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector('app-source-content-menu')).toBeNull();
    expect(host.textContent).toContain('Chapter 1');
  });
});
