import { DocSummary } from '../../services/docs.service';

export interface DocTreeNode {
  slug: string;
  label: string;
  doc?: DocSummary;
  children: DocTreeNode[];
  sortIndex: number;
}
