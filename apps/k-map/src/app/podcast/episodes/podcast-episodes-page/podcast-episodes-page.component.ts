import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-podcast-episodes-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './podcast-episodes-page.component.html'
})
export class PodcastEpisodesPageComponent {
  columns = ['title', 'status', 'updated_at'];
  rows: Array<Record<string, string>> = [];
}
