import { TestBed } from '@angular/core/testing';

import { WvDistillService } from './wv-distill.service';

describe('WvDistillService', () => {
  it('creates a new draft when the latest batch is completed', () => {
    TestBed.configureTestingModule({
      providers: [WvDistillService],
    });

    const service = TestBed.inject(WvDistillService);
    service.hydrateBatch(
      {
        id: 'batch-completed',
        unitId: 'unit-1',
        sourceId: 'source-1',
        batchType: 'distill',
        workspaceId: 'ws_worldview',
        status: 'completed',
        createdAt: '2026-03-16T00:00:00Z',
        updatedAt: '2026-03-16T00:00:00Z',
      },
      [],
    );

    const draft = service.ensureDraftBatch('source-1', 'unit-1');

    expect(draft.status).toBe('draft');
    expect(draft.id).not.toBe('batch-completed');
    expect(service.getBatchForUnit('unit-1')?.id).toBe(draft.id);
  });
});
