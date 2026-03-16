import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute, Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { of } from 'rxjs';

import { KmapsWorkflowService } from '../../../../../shared/services/kmaps-workflow.service';
import { type KmapsSource, type KmapsSourceUnit } from '../../../kmaps-shared/models/kmaps.models';
import { SourceUnitPage } from './source-unit-page';

describe('SourceUnitPage', () => {
  it('does not render the generated output menu on source unit pages', async () => {
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
    const parentUnit: KmapsSourceUnit = {
      id: 'unit-parent',
      canonicalInput: 'wv_unit|chapter|unit-parent',
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
    };
    const childUnit: KmapsSourceUnit = {
      id: 'unit-child',
      canonicalInput: 'wv_unit|section|unit-child',
      sourceId: source.id,
      parentUnitId: parentUnit.id,
      unitType: 'section',
      title: 'Section 1.1',
      orderIndex: 0,
      startRef: '1.1',
      endRef: '1.4',
      locatorLabel: 'Section 1.1',
      anchorText: null,
      summary: null,
      readingMinutes: 5,
      readingBody: [],
      unitJson: null,
      metaJson: null,
      createdAt: '2026-03-16T00:00:00Z',
      updatedAt: null,
    };
    const allUnits = [parentUnit, childUnit];

    TestBed.configureTestingModule({
      imports: [SourceUnitPage],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ sourceId: source.id, unitId: parentUnit.id })),
          },
        },
        {
          provide: Router,
          useValue: {
            url: `/worldview/sources/${source.id}/units/${parentUnit.id}`,
            events: of(),
            navigate: jasmine.createSpy('navigate'),
          },
        },
        {
          provide: KmapsWorkflowService,
          useValue: {
            getSource: (sourceId: string) => (sourceId === source.id ? source : null),
            getUnitsForSource: (sourceId: string) => (sourceId === source.id ? allUnits : []),
            getUnit: (unitId: string) => allUnits.find((unit) => unit.id === unitId) ?? null,
            getNotesForUnitScope: () => [],
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

    const fixture = TestBed.createComponent(SourceUnitPage);
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector('app-source-content-menu')).toBeNull();
    expect(host.textContent).toContain('Section 1.1');
  });
});
