import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AppHeaderbarComponent } from '../../../../shared/components';
import {
  PageHeaderFilterChangeEvent,
  PageHeaderFilterConfig,
} from '../../../../shared/models/core/page-header.model';
import { GrammarService } from '../../../../shared/services/grammar.service';
import { ToastService } from '../../../../shared/services/toast.service';

type GrammarConcept = {
  ar_u_grammar: string;
  title: string | null;
  title_ar: string | null;
};

type GrammarExample = {
  id: number;
  grammar_id: string | null;
  title: string | null;
  excerpt: string;
  commentary: string | null;
  extra: Record<string, unknown>;
  created_at: string;
};

@Component({
  selector: 'app-grammar-examples',
  standalone: true,
  imports: [CommonModule, FormsModule, AppHeaderbarComponent],
  templateUrl: './grammar-examples.component.html',
  styleUrls: ['./grammar-examples.component.scss'],
})
export class GrammarExamplesComponent implements OnInit {
  concepts: GrammarConcept[] = [];
  examples: GrammarExample[] = [];
  q = '';
  selectedGrammarId = '';
  selectedType = '';
  loading = false;
  error = '';

  showExampleModal = false;
  showBulkModal = false;
  exampleForm: any = this.blankExampleForm();
  bulkText = '';

  constructor(
    private grammar: GrammarService,
    private toast: ToastService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      this.selectedGrammarId = params['grammar_id'] ?? '';
      this.load();
    });
  }

  get headerFilters(): PageHeaderFilterConfig[] {
    return [
      {
        id: 'grammar',
        queryParamKey: 'grammar_id',
        value: this.selectedGrammarId,
        options: [
          { value: '', label: 'All nodes' },
          ...this.concepts.map((c) => ({
            value: c.ar_u_grammar,
            label: c.title ?? c.title_ar ?? c.ar_u_grammar.slice(0, 8),
          })),
        ],
        resetPageOnChange: false,
      },
      {
        id: 'type',
        queryParamKey: 'type',
        value: this.selectedType,
        options: [
          { value: '', label: 'All types' },
          { value: 'quran', label: 'Quran' },
          { value: 'textbook', label: 'Textbook' },
          { value: 'custom', label: 'Custom' },
        ],
        resetPageOnChange: false,
      },
    ];
  }

  onHeaderSearchInput(value: string) {
    this.q = value || '';
    this.loadExamples();
  }

  onHeaderFilterChange(event: PageHeaderFilterChangeEvent) {
    if (event.id === 'grammar') {
      this.selectedGrammarId = event.value;
    }
    if (event.id === 'type') {
      this.selectedType = event.value;
    }
    this.loadExamples();
  }

  async load() {
    this.loading = true;
    this.error = '';
    try {
      const conceptRes = await this.grammar.listConcepts();
      this.concepts = conceptRes?.concepts ?? [];
      await this.loadExamples();
    } catch (err: any) {
      this.error = err?.message ?? 'Failed to load examples.';
    } finally {
      this.loading = false;
    }
  }

  async loadExamples() {
    try {
      const data = await this.grammar.listExamples({
        grammar_id: this.selectedGrammarId || undefined,
        q: this.q || undefined,
        type: this.selectedType || undefined,
      });
      this.examples = data?.results ?? [];
    } catch (err: any) {
      this.error = err?.message ?? 'Failed to load examples.';
    }
  }

  openNewExample() {
    this.exampleForm = this.blankExampleForm();
    if (this.selectedGrammarId) {
      this.exampleForm.grammar_id = this.selectedGrammarId;
    }
    this.showExampleModal = true;
  }

  openEditExample(example: GrammarExample) {
    this.exampleForm = {
      id: example.id,
      grammar_id: example.grammar_id || '',
      excerpt: example.excerpt,
      commentary: example.commentary || '',
      type: (example.extra?.['example_type'] as string) || 'custom',
      surah: example.extra?.['surah'] ?? '',
      ayah: example.extra?.['ayah'] ?? '',
      tags: Array.isArray(example.extra?.['tags']) ? (example.extra?.['tags'] as string[]).join(', ') : '',
    };
    this.showExampleModal = true;
  }

  closeExampleModal() {
    this.showExampleModal = false;
  }

  async saveExample() {
    const tags = String(this.exampleForm.tags || '')
      .split(',')
      .map((t: string) => t.trim())
      .filter(Boolean);

    const payload = {
      grammar_id: this.exampleForm.grammar_id || null,
      excerpt: this.exampleForm.excerpt,
      commentary: this.exampleForm.commentary || null,
      extra: {
        example_type: this.exampleForm.type || 'custom',
        surah: this.exampleForm.surah ? Number(this.exampleForm.surah) : null,
        ayah: this.exampleForm.ayah ? Number(this.exampleForm.ayah) : null,
        tags,
      },
    };

    try {
      if (this.exampleForm.id) {
        await this.grammar.updateExample(this.exampleForm.id, payload);
        this.toast.show('Example updated', 'success');
      } else {
        await this.grammar.createExample(payload);
        this.toast.show('Example created', 'success');
      }
      this.showExampleModal = false;
      await this.loadExamples();
    } catch (err: any) {
      this.toast.show(err?.message ?? 'Failed to save example', 'error');
    }
  }

  async deleteExample(example: GrammarExample) {
    if (!confirm('Delete this example?')) return;
    try {
      await this.grammar.deleteExample(example.id);
      this.toast.show('Example deleted', 'success');
      await this.loadExamples();
    } catch (err: any) {
      this.toast.show(err?.message ?? 'Failed to delete example', 'error');
    }
  }

  openBulkImport() {
    this.bulkText = '';
    this.showBulkModal = true;
  }

  closeBulkModal() {
    this.showBulkModal = false;
  }

  async runBulkImport() {
    const rows = this.bulkText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!rows.length) return;

    let success = 0;
    for (const row of rows) {
      const parts = row.includes('|') ? row.split('|') : row.split(',');
      const [grammarId, excerpt, commentary, type, surah, ayah] = parts.map((p) => p.trim());
      if (!excerpt) continue;
      try {
        await this.grammar.createExample({
          grammar_id: grammarId || null,
          excerpt,
          commentary: commentary || null,
          extra: {
            example_type: type || 'custom',
            surah: surah ? Number(surah) : null,
            ayah: ayah ? Number(ayah) : null,
          },
        });
        success += 1;
      } catch {
        // skip errors
      }
    }

    this.toast.show(`Imported ${success} examples`, 'success');
    this.showBulkModal = false;
    await this.loadExamples();
  }

  private blankExampleForm() {
    return {
      id: null,
      grammar_id: '',
      excerpt: '',
      commentary: '',
      type: 'custom',
      surah: '',
      ayah: '',
      tags: '',
    };
  }
}
