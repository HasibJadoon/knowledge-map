import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { IonItemSliding, IonicModule } from '@ionic/angular';
import { bookmarkOutline, sparklesOutline } from 'ionicons/icons';
import { LongPressDirective } from '../../../../shared/directives/long-press.directive';
import { BrainstormIdea } from '../../brainstorm.models';

@Component({
  selector: 'app-idea-row',
  standalone: true,
  imports: [CommonModule, IonicModule, LongPressDirective],
  templateUrl: './idea-row.component.html',
  styleUrl: './idea-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeaRowComponent {
  readonly icons = {
    bookmarkOutline,
    sparklesOutline,
  };

  @Input({ required: true }) idea!: BrainstormIdea;
  @Input() topicLabel: string | null = null;

  @Output() selected = new EventEmitter<string>();
  @Output() longPressed = new EventEmitter<string>();
  @Output() toggledPin = new EventEmitter<string>();
  @Output() toggledHighlight = new EventEmitter<string>();
  @Output() edited = new EventEmitter<string>();
  @Output() deleted = new EventEmitter<string>();

  @ViewChild(IonItemSliding) private slidingItem?: IonItemSliding;

  get metaLine(): string {
    const parts = [this.topicLabel, formatRelativeDate(this.idea.updatedAt)].filter(Boolean);
    return parts.join(' • ');
  }

  onSelect(): void {
    this.selected.emit(this.idea.id);
  }

  onLongPress(): void {
    this.longPressed.emit(this.idea.id);
  }

  async onTogglePin(): Promise<void> {
    this.toggledPin.emit(this.idea.id);
    await this.slidingItem?.close();
  }

  async onToggleHighlight(): Promise<void> {
    this.toggledHighlight.emit(this.idea.id);
    await this.slidingItem?.close();
  }

  async onEdit(): Promise<void> {
    this.edited.emit(this.idea.id);
    await this.slidingItem?.close();
  }

  async onDelete(): Promise<void> {
    this.deleted.emit(this.idea.id);
    await this.slidingItem?.close();
  }
}

function formatRelativeDate(value: string): string {
  const elapsed = Date.now() - new Date(value).getTime();
  const minutes = Math.round(elapsed / 60000);

  if (minutes < 60) {
    return `${Math.max(minutes, 1)}m ago`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
