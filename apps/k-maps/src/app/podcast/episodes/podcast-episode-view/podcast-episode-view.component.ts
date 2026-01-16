import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-podcast-episode-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './podcast-episode-view.component.html'
})
export class PodcastEpisodeViewComponent {
  jsonValue = '{\n  "notes": ""\n}';
}
