import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-podcast-episode-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './podcast-episode-editor.component.html'
})
export class PodcastEpisodeEditorComponent {
  titleValue = '';
  jsonValue = '{\n  "notes": ""\n}';
}
