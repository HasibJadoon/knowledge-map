import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface ArContainer {
  id: number | string;
  title: string;
  type?: string;
  level?: string;
  description?: string;
}

interface ArUnit {
  id: number | string;
  title: string;
  order?: number;
  description?: string;
}

@Component({
  selector: 'km-arabic-library',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './arabic-library.component.html',
  styleUrl: './arabic-library.component.scss',
})
export class ArabicLibraryComponent implements OnInit {
  private router = inject(Router);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private readonly base = environment.apiBase;

  containers = signal<ArContainer[]>([]);
  selected = signal<ArContainer | null>(null);
  units = signal<ArUnit[]>([]);
  loading = signal(true);
  unitsLoading = signal(false);

  skeletons = [1, 2, 3, 4, 5];

  ngOnInit(): void {
    this.loadContainers();
  }

  private loadContainers(): void {
    this.loading.set(true);
    this.http.get<any>(`${this.base}/ar/containers?limit=50`).subscribe({
      next: (res) => {
        if (res?.ok && Array.isArray(res.containers)) {
          this.containers.set(res.containers);
        }
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  select(c: ArContainer): void {
    this.selected.set(c);
    this.units.set([]);
    this.unitsLoading.set(true);
    this.http.get<any>(`${this.base}/ar/units?container_id=${c.id}`).subscribe({
      next: (res) => {
        if (res?.ok && Array.isArray(res.units)) {
          this.units.set(res.units);
        }
        this.unitsLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.unitsLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  back(): void {
    this.router.navigate(['/arabic']);
  }
}
