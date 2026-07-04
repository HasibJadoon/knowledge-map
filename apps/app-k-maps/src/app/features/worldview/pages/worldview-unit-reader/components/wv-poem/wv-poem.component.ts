import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PoemCouplet {
  n: number;
  m1: string; // مصراع اول — first hemistich (right column in RTL)
  m2: string; // مصراع دوم — second hemistich (left column)
}

export interface PoemData {
  title?: string;
  work?: string;
  book?: string;
  section?: string;
  poet?: string;
  meter?: string;
  lang?: string;
  dir?: string;
  couplet_count?: number;
  couplets: PoemCouplet[];
}

/**
 * Renders a Persian/Arabic poem as proper verse: each بیت (couplet) is two
 * مصراع (hemistichs) laid out side-by-side on wide screens (m1 right, m2 left,
 * as a Masnavi page reads) and stacked on narrow screens. The container is
 * `dir="rtl" lang="fa"`, so the app's global Arabic font stack applies.
 *
 * Data comes off `unit.meta_json.poem`; the canonical text also lives
 * couplet-by-couplet in `wv_source_chunks`.
 */
@Component({
  selector: 'app-wv-poem',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './wv-poem.component.html',
  styleUrl: './wv-poem.component.scss',
})
export class WvPoemComponent {
  readonly poem = input.required<PoemData>();

  /** Western digits → Persian (Eastern Arabic-Indic) digits. */
  persianNumeral(value: number): string {
    const map = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return String(value)
      .split('')
      .map((d) => map[Number(d)] ?? d)
      .join('');
  }
}
