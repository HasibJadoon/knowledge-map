import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ArLessonsService } from '../../shared/services/ar-lessons.service';

@Component({
  selector: 'app-ar-lessons-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="card">
    <div class="card-body">
      <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
        <h5 class="mb-0 me-auto">Arabic Lessons</h5>
        <input
          class="form-control form-control-sm w-auto"
          type="search"
          placeholder="Search title or source"
          [(ngModel)]="q"
          (input)="onSearchInput()"
        />
        <button class="btn btn-primary btn-sm" type="button" (click)="createNew()">
          New
        </button>
      </div>

      <div *ngIf="error" class="alert alert-danger py-2">{{ error }}</div>
      <div *ngIf="loading" class="text-muted">Loading…</div>

      <div *ngIf="!loading && rows.length === 0" class="text-muted">No lessons yet.</div>

      <div *ngIf="!loading && rows.length" class="table-responsive">
        <table class="table table-sm align-middle">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Status</th>
              <th>Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of rows">
              <td>{{ row.title }}</td>
              <td>{{ row.lesson_type }}</td>
              <td>{{ row.status }}</td>
              <td>{{ row.updated_at || row.created_at }}</td>
              <td class="text-end">
                <button class="btn btn-outline-secondary btn-sm me-1" (click)="view(row.id)">
                  View
                </button>
                <button class="btn btn-primary btn-sm" (click)="edit(row.id)">
                  Edit
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
  `
})
export class ArLessonsPageComponent implements OnInit {
  private router = inject(Router);
  private lessons = inject(ArLessonsService);

  q = '';
  rows: Array<{
    id: number;
    title: string;
    lesson_type: string;
    status: string;
    created_at?: string;
    updated_at?: string;
  }> = [];

  loading = false;
  error = '';
  private debounce?: ReturnType<typeof setTimeout>;

  ngOnInit() {
    this.load();
  }

  onSearchInput() {
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.load(), 250);
  }

  async load() {
    this.loading = true;
    this.error = '';
    try {
      const data = await this.lessons.list(this.q ? { q: this.q, limit: '100' } : { limit: '100' });
      this.rows = Array.isArray((data as any)?.results) ? (data as any).results : [];
    } catch (err: any) {
      this.error = err?.message ?? 'Failed to load lessons';
      this.rows = [];
    } finally {
      this.loading = false;
    }
  }

  createNew() {
    this.router.navigate(['/arabic/lessons/new']);
  }

  view(id: number) {
    this.router.navigate(['/arabic/lessons', id]);
  }

  edit(id: number) {
    this.router.navigate(['/arabic/lessons', id, 'edit']);
  }
}
