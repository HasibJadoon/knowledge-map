import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-podcast-episodes-page',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="card">
      <div class="card-body">
        <div class="d-flex align-items-center mb-3">
          <h5 class="mb-0 me-auto">Podcast Episodes Page</h5>
          <button class="btn btn-primary btn-sm" type="button">New</button>
        </div>
        <div *ngIf="rows.length === 0" class="text-muted">No items yet.</div>
        <div *ngIf="rows.length" class="table-responsive">
          <table class="table table-sm align-middle">
            <thead>
              <tr>
                <th *ngFor="let col of columns">{{ col }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of rows">
                <td *ngFor="let col of columns">{{ row[col] }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class PodcastEpisodesPageComponent {
  columns = ['title', 'status', 'updated_at'];
  rows: Array<Record<string, string>> = [];
}
