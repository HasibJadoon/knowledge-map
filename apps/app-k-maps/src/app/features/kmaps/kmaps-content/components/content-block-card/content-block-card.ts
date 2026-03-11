import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { KmapsContentBlock, formatContentBlockLabel } from '../../../kmaps-shared/models/kmaps.models';

@Component({
  selector: 'app-content-block-card',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './content-block-card.html',
  styleUrl: './content-block-card.scss',
})
export class ContentBlockCardComponent {
  @Input({ required: true }) block!: KmapsContentBlock;
  @Input() canMoveUp = false;
  @Input() canMoveDown = false;

  @Output() selected = new EventEmitter<string>();
  @Output() moveUp = new EventEmitter<string>();
  @Output() moveDown = new EventEmitter<string>();
  @Output() remove = new EventEmitter<string>();

  get blockLabel(): string {
    return formatContentBlockLabel(this.block.kind);
  }
}
