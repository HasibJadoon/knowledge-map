import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { NotesService, ResearchNote } from './notes.service';
import { hapticSuccess, hapticTick } from '../../../../shared/utils/haptics.util';

@Component({
  selector: 'app-notes-page',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './notes-page.component.html',
  styleUrl: './notes-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotesPageComponent {
  readonly notes = inject(NotesService);
  private readonly toastCtrl = inject(ToastController);

  // Compose / edit modal state.
  readonly composerOpen   = signal(false);
  readonly composerText   = signal('');
  readonly editingId      = signal<string | null>(null);

  /** Locale-formatted date string for the note row. */
  formatWhen(ts: number): string {
    try {
      return new Intl.DateTimeFormat('ar-EG', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(ts));
    } catch {
      return new Date(ts).toLocaleString();
    }
  }

  /** Human-readable summary of where the note was captured from. */
  anchorLabel(n: ResearchNote): string | null {
    const a = n.anchor;
    if (!a) return null;
    switch (a.kind) {
      case 'ayah':   return a.surahAyah ? `الآية ${a.surahAyah}` : 'آية';
      case 'root':   return a.root ? `جذر ${a.root}` : 'جذر';
      case 'source': return a.sourceLabel ?? a.sourceSlug ?? 'مصدر';
    }
  }

  openComposer(): void {
    void hapticTick();
    this.editingId.set(null);
    this.composerText.set('');
    this.composerOpen.set(true);
  }

  openEditor(n: ResearchNote): void {
    void hapticTick();
    this.editingId.set(n.id);
    this.composerText.set(n.text);
    this.composerOpen.set(true);
  }

  closeComposer(): void {
    this.composerOpen.set(false);
    this.editingId.set(null);
    this.composerText.set('');
  }

  async save(): Promise<void> {
    const text = this.composerText().trim();
    if (!text) { this.closeComposer(); return; }
    const id = this.editingId();
    if (id) {
      this.notes.update(id, { text });
      await this.toast('تم تحديث الحاشية');
    } else {
      this.notes.add(text);
      await this.toast('تمت الإضافة');
    }
    void hapticSuccess();
    this.closeComposer();
  }

  async remove(n: ResearchNote, ev?: Event): Promise<void> {
    ev?.stopPropagation();
    this.notes.remove(n.id);
    void hapticTick();
    await this.toast('تم الحذف');
  }

  private async toast(message: string): Promise<void> {
    const t = await this.toastCtrl.create({
      message,
      duration: 1400,
      position: 'top',
      cssClass: 'qrs-toast',
    });
    await t.present();
  }
}
