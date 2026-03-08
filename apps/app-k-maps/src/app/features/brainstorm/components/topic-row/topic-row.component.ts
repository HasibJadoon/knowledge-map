import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { IonItemSliding, IonicModule } from '@ionic/angular';
import { LongPressDirective } from '../../../../shared/directives/long-press.directive';
import { BrainstormTopic } from '../../brainstorm.models';

@Component({
  selector: 'app-topic-row',
  standalone: true,
  imports: [CommonModule, IonicModule, LongPressDirective],
  templateUrl: './topic-row.component.html',
  styleUrl: './topic-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopicRowComponent {
  @Input({ required: true }) topic!: BrainstormTopic;

  @Output() selected = new EventEmitter<string>();
  @Output() longPressed = new EventEmitter<string>();
  @Output() archived = new EventEmitter<string>();
  @Output() deleted = new EventEmitter<string>();

  @ViewChild(IonItemSliding) private slidingItem?: IonItemSliding;

  get updatedLabel(): string {
    return formatRelativeDate(this.topic.updatedAt);
  }

  get ideaCountLabel(): string {
    return this.topic.ideaCount === 1 ? 'Idea' : 'Ideas';
  }

  get topicInitials(): string {
    return toInitials(this.topic.title);
  }

  onSelect(): void {
    this.selected.emit(this.topic.id);
  }

  onLongPress(): void {
    this.longPressed.emit(this.topic.id);
  }

  async onArchive(): Promise<void> {
    this.archived.emit(this.topic.id);
    await this.slidingItem?.close();
  }

  async onDelete(): Promise<void> {
    this.deleted.emit(this.topic.id);
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

function toInitials(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return 'KM';
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}
