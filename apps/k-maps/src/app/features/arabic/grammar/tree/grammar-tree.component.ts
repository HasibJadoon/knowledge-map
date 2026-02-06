import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppHeaderbarComponent } from '../../../../shared/components';
import { GrammarService } from '../../../../shared/services/grammar.service';
import { ToastService } from '../../../../shared/services/toast.service';

type GrammarConcept = {
  ar_u_grammar: string;
  grammar_id: string;
  category: string | null;
  title: string | null;
  title_ar: string | null;
  definition: string | null;
  definition_ar: string | null;
  meta: Record<string, unknown>;
};

type GrammarRelation = {
  parent_ar_u_grammar: string;
  child_ar_u_grammar: string;
  relation_type: string;
  order_index: number | null;
};

type TreeNode = {
  id: string;
  level: number;
  isLeaf: boolean;
};

@Component({
  selector: 'app-grammar-tree',
  standalone: true,
  imports: [CommonModule, FormsModule, AppHeaderbarComponent],
  templateUrl: './grammar-tree.component.html',
  styleUrls: ['./grammar-tree.component.scss'],
})
export class GrammarTreeComponent implements OnInit {
  concepts: GrammarConcept[] = [];
  relations: GrammarRelation[] = [];
  nodes: TreeNode[] = [];
  conceptMap = new Map<string, GrammarConcept>();
  expanded = new Set<string>();

  search = '';
  loading = false;
  error = '';

  selectedId: string | null = null;
  editForm = this.blankForm();
  showChildModal = false;
  childForm = this.blankChildForm();

  examples: any[] = [];

  constructor(
    private grammar: GrammarService,
    private toast: ToastService,
    private router: Router
  ) {}

  ngOnInit() {
    this.load();
  }

  get selectedConcept() {
    return this.concepts.find((c) => c.ar_u_grammar === this.selectedId) || null;
  }

  async load() {
    this.loading = true;
    this.error = '';
    try {
      const data = await this.grammar.listConcepts();
      this.concepts = data?.concepts ?? [];
      this.conceptMap = new Map(this.concepts.map((c) => [c.ar_u_grammar, c]));
      this.relations = data?.relations ?? [];
      if (!this.selectedId && this.concepts.length) {
        this.selectedId = this.concepts[0].ar_u_grammar;
      }
      this.buildTree();
      this.syncForm();
      if (this.selectedId) {
        await this.loadExamples(this.selectedId);
      }
    } catch (err: any) {
      this.error = err?.message ?? 'Failed to load concepts.';
    } finally {
      this.loading = false;
    }
  }

  conceptById(id: string) {
    return this.conceptMap.get(id) || null;
  }

  buildTree() {
    if (this.search) {
      const q = this.search.toLowerCase();
      const filtered = this.concepts.filter((c) =>
        `${c.title ?? ''} ${c.title_ar ?? ''} ${c.grammar_id}`.toLowerCase().includes(q)
      );
      this.nodes = filtered.map((c) => ({ id: c.ar_u_grammar, level: 0, isLeaf: true }));
      return;
    }

    const childrenMap = new Map<string, string[]>();
    const childSet = new Set<string>();
    for (const rel of this.relations) {
      const arr = childrenMap.get(rel.parent_ar_u_grammar) ?? [];
      arr.push(rel.child_ar_u_grammar);
      childrenMap.set(rel.parent_ar_u_grammar, arr);
      childSet.add(rel.child_ar_u_grammar);
    }

    const roots = this.concepts
      .map((c) => c.ar_u_grammar)
      .filter((id) => !childSet.has(id));

    const output: TreeNode[] = [];
    const visit = (id: string, level: number) => {
      const children = childrenMap.get(id) ?? [];
      output.push({ id, level, isLeaf: children.length === 0 });
      if (this.expanded.has(id)) {
        for (const child of children) {
          visit(child, level + 1);
        }
      }
    };

    roots.forEach((root) => visit(root, 0));
    this.nodes = output;
  }

  onSearch(value: string) {
    this.search = value;
    this.buildTree();
  }

  toggleNode(node: TreeNode) {
    if (node.isLeaf) return;
    if (this.expanded.has(node.id)) {
      this.expanded.delete(node.id);
    } else {
      this.expanded.add(node.id);
    }
    this.buildTree();
  }

  selectNode(node: TreeNode) {
    this.selectedId = node.id;
    this.syncForm();
    if (this.selectedId) {
      this.loadExamples(this.selectedId);
    }
  }

  syncForm() {
    const concept = this.selectedConcept;
    if (!concept) return;
    const tags = Array.isArray(concept.meta?.['tags']) ? (concept.meta['tags'] as string[]) : [];
    this.editForm = {
      id: concept.ar_u_grammar,
      title: concept.title ?? '',
      title_ar: concept.title_ar ?? '',
      category: concept.category ?? '',
      definition: concept.definition ?? '',
      definition_ar: concept.definition_ar ?? '',
      tags: tags.join(', '),
    };
  }

  async saveConcept() {
    if (!this.editForm.id) return;
    const tags = String(this.editForm.tags || '')
      .split(',')
      .map((t: string) => t.trim())
      .filter(Boolean);
    try {
      await this.grammar.updateConcept(this.editForm.id, {
        title: this.editForm.title,
        title_ar: this.editForm.title_ar,
        category: this.editForm.category,
        definition: this.editForm.definition,
        definition_ar: this.editForm.definition_ar,
        tags,
      });
      this.toast.show('Concept updated', 'success');
      await this.load();
    } catch (err: any) {
      this.toast.show(err?.message ?? 'Failed to update concept', 'error');
    }
  }

  openChildModal() {
    if (!this.selectedId) return;
    this.childForm = this.blankChildForm();
    this.showChildModal = true;
  }

  closeChildModal() {
    this.showChildModal = false;
  }

  async createChild() {
    if (!this.selectedId) return;
    try {
      await this.grammar.createConcept({
        title: this.childForm.title,
        title_ar: this.childForm.title_ar,
        category: this.childForm.category,
        definition: this.childForm.definition,
        definition_ar: this.childForm.definition_ar,
        parent_id: this.selectedId,
        tags: String(this.childForm.tags || '')
          .split(',')
          .map((t: string) => t.trim())
          .filter(Boolean),
      });
      this.toast.show('Child concept created', 'success');
      this.showChildModal = false;
      await this.load();
    } catch (err: any) {
      this.toast.show(err?.message ?? 'Failed to create child concept', 'error');
    }
  }

  async loadExamples(grammarId: string) {
    try {
      const data = await this.grammar.listExamples({ grammar_id: grammarId });
      this.examples = data?.results ?? [];
    } catch {
      this.examples = [];
    }
  }

  openExamples() {
    if (!this.selectedId) return;
    this.router.navigate(['/arabic/grammar/examples'], {
      queryParams: { grammar_id: this.selectedId },
    });
  }

  private blankForm() {
    return {
      id: '',
      title: '',
      title_ar: '',
      category: '',
      definition: '',
      definition_ar: '',
      tags: '',
    };
  }

  private blankChildForm() {
    return {
      title: '',
      title_ar: '',
      category: '',
      definition: '',
      definition_ar: '',
      tags: '',
    };
  }
}
