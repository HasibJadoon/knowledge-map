import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { TokensService } from '../../../shared/services/tokens.service';
import { TokenRow } from '../../../shared/models/token.model';

@Component({
  selector: 'app-arabic-tokens',
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule, TitleCasePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './arabic-tokens.page.html',
  styleUrls: ['./arabic-tokens.page.scss'],
})
export class ArabicTokensPage implements OnInit {
  readonly posOptions = ['verb', 'noun', 'adj', 'particle', 'phrase'];

  private readonly tokensService = inject(TokensService);

  q = '';
  pos = '';
  page = 1;
  pageSize = 25;
  tokens: TokenRow[] = [];
  total = 0;
  loading = false;
  error = '';

  ngOnInit() {
    this.load();
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  async load() {
    this.loading = true;
    this.error = '';
    try {
      const response = await firstValueFrom(
        this.tokensService.list({
          q: this.q.trim() || undefined,
          pos: this.pos || undefined,
          page: this.page,
          pageSize: this.pageSize,
        })
      );
      this.tokens = response.results;
      this.total = response.total;
    } catch (err: any) {
      this.error = err?.message ?? 'Unable to load tokens.';
    } finally {
      this.loading = false;
    }
  }

  onSearch() {
    this.page = 1;
    this.load();
  }

  changePage(direction: 'prev' | 'next') {
    if (direction === 'prev' && this.page > 1) {
      this.page -= 1;
      this.load();
    }
    if (direction === 'next' && this.page < this.totalPages) {
      this.page += 1;
      this.load();
    }
  }

  displayRoot(token: TokenRow) {
    if (!token.root && !token.root_norm) {
      return '—';
    }
    if (token.root && token.root_norm) {
      return `${token.root} (${token.root_norm})`;
    }
    return token.root ?? token.root_norm ?? '—';
  }
}
