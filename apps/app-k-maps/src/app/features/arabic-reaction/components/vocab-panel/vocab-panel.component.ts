import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  signal,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SceneContent } from '../../reaction.models';

type Tab = 'vocab' | 'idioms' | 'sentences' | 'notes';

@Component({
  selector: 'km-vocab-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './vocab-panel.component.html',
})
export class VocabPanelComponent implements OnChanges {
  @Input() content: SceneContent | null = null;

  activeTab = signal<Tab>('vocab');

  ngOnChanges(changes: SimpleChanges): void {
    // Reset to vocab tab whenever the scene changes
    if (changes['content']) {
      this.activeTab.set('vocab');
    }
  }

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
  }

  get vocabCount(): number { return this.content?.vocab.length ?? 0; }
  get idiomsCount(): number { return this.content?.idioms.length ?? 0; }
  get sentencesCount(): number { return this.content?.sentences.length ?? 0; }
  get hasNotes(): boolean { return !!this.content?.notes; }
}
