import { TestBed } from '@angular/core/testing';

import { type KmapsNote } from '../../../kmaps-shared/models/kmaps.models';
import { NoteCardComponent } from './note-card';

describe('NoteCardComponent', () => {
  it('uses Arabic RTL rendering and hides duplicate headings and bodies', async () => {
    await TestBed.configureTestingModule({
      imports: [NoteCardComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(NoteCardComponent);
    const component = fixture.componentInstance;
    const note: KmapsNote = {
      id: 'note-1',
      canonicalInput: 'wv_note|highlight|note-1',
      userId: 1,
      sourceId: 'source-1',
      sourceUnitId: 'unit-1',
      noteKind: 'highlight',
      title: 'Highlight',
      bodyMd: 'وَنِعْمَ نِعْمَةٌ عَلَيْكَ',
      excerptText: 'وَنِعْمَ نِعْمَةٌ عَلَيْكَ',
      locator: '12:6',
      status: 'active',
      noteJson: null,
      metaJson: null,
      createdAt: '2026-03-16T00:00:00Z',
      updatedAt: null,
    };

    component.note = note;
    component.variant = 'distill';
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement;
    const excerpt = host.querySelector('.note-card__excerpt') as HTMLElement | null;

    expect(component.showHeading).toBeFalse();
    expect(component.showBody).toBeFalse();
    expect(excerpt).not.toBeNull();
    expect(excerpt?.getAttribute('dir')).toBe('rtl');
    expect(excerpt?.getAttribute('lang')).toBe('ar');
    expect(excerpt?.classList.contains('note-card__excerpt--arabic')).toBeTrue();
    expect(host.querySelector('h3')).toBeNull();
    expect(host.querySelector('.note-card__body')).toBeNull();
  });
});
