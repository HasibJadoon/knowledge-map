import { Component, OnInit, inject } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ArabicRootsService, ArabicRoot } from '../../../shared/services/arabic-roots.service';
import { RootCardsComponent } from './root-cards/root-cards.component';

type RootCard = { front: string; back: string; tag?: string };


@Component({
  selector: 'app-arabic-roots',
  templateUrl: './arabic-roots.page.html',
  styleUrls: ['./arabic-roots.page.scss'],
  standalone: false,
})
export class ArabicRootsPage implements OnInit {
  selectedRoot: ArabicRoot | null = null;
  selectedCards: RootCard[] = [];

  roots: ArabicRoot[] = [];
  filtered: ArabicRoot[] = [];
  loading = false;
  error = '';
  searchTerm = '';

  private readonly rootsService = inject(ArabicRootsService);
  private readonly modalCtrl = inject(ModalController);

  ngOnInit(): void {
    this.loadRoots();
  }

  loadRoots(event?: CustomEvent): void {
    this.loading = true;
    this.error = '';

    this.rootsService.list().subscribe({
      next: (response) => {
        const results = Array.isArray(response?.results) ? response.results : [];
        this.roots = results;
        this.applyFilter(this.searchTerm);
        this.loading = false;
        if (event?.target && 'complete' in event.target) {
          (event.target as HTMLIonRefresherElement).complete();
        }
      },
      error: (err) => {
        const apiError = err?.error?.message || err?.error?.error;
        this.error = apiError || 'Failed to load roots.';
        this.loading = false;
        if (event?.target && 'complete' in event.target) {
          (event.target as HTMLIonRefresherElement).complete();
        }
      },
    });
  }


  async openRootModal(root: ArabicRoot): Promise<void> {
    this.selectedRoot = root;
    this.selectedCards = this.parseCards(root.cards);

    const modal = await this.modalCtrl.create({
      component: RootCardsComponent,
      cssClass: 'root-cards-modal',
      componentProps: {
        root: root.root ?? '',
        family: root.family ?? '',
        cards: this.selectedCards,
      },
    });

    await modal.present();
  }

  private parseCards(raw: ArabicRoot['cards']): RootCard[] {
    if (!raw) {
      return [];
    }
    let parsed: unknown = raw;
    if (typeof parsed === 'string') {
      try {
        for (let i = 0; i < 2; i += 1) {
          if (typeof parsed === 'string') {
            parsed = JSON.parse(parsed);
          }
        }
      } catch {
        return [];
      }
    }

    const arr = Array.isArray(parsed)
      ? parsed
      : parsed && Array.isArray((parsed as { cards?: unknown }).cards)
      ? (parsed as { cards: unknown[] }).cards
      : null;

    if (!arr) {
      return [];
    }

    return arr.map((item: any) => {
      if (typeof item === 'string') {
        return { front: item, back: '', tag: '' };
      }
      return {
        front: typeof item?.front === 'string' ? item.front : String(item?.front ?? ''),
        back: typeof item?.back === 'string' ? item.back : String(item?.back ?? ''),
        tag: typeof item?.tag === 'string' ? item.tag : String(item?.tag ?? ''),
      };
    });
  }

  getSelectedCards(): RootCard[] {
    const raw = this.selectedRoot?.cards;
    if (!raw) {
      return [];
    }
    if (Array.isArray(raw)) {
      return raw as RootCard[];
    }
    if (typeof raw !== 'string') {
      return [];
    }
    try {
      let parsed: unknown = raw;
      for (let i = 0; i < 2; i += 1) {
        if (typeof parsed === 'string') {
          parsed = JSON.parse(parsed);
        }
      }
      return Array.isArray(parsed) ? (parsed as RootCard[]) : [];
    } catch {
      return [];
    }
  }

  onSearchChange(event: CustomEvent): void {
    const value = (event.detail as any)?.value ?? '';
    this.applyFilter(String(value));
  }

  private applyFilter(term: string): void {
    const normalized = term.trim().toLowerCase();
    this.searchTerm = term;
    if (!normalized) {
      this.filtered = [...this.roots];
      return;
    }

    this.filtered = this.roots.filter((item) => {
      const root = item.root?.toLowerCase() ?? '';
      const family = item.family?.toLowerCase() ?? '';
      const rootLatn = item.root_latn?.toLowerCase() ?? '';
      const rootNorm = item.root_norm?.toLowerCase() ?? '';
      const searchKeys = item.search_keys_norm?.toLowerCase() ?? '';
      return (
        root.includes(normalized) ||
        family.includes(normalized) ||
        rootLatn.includes(normalized) ||
        rootNorm.includes(normalized) ||
        searchKeys.includes(normalized)
      );
    });
  }
}
