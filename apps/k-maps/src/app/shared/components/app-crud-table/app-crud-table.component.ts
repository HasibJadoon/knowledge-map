import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CRUD_TABLE_ICON_ALIASES,
  CRUD_TABLE_ICON_LIBRARY,
  CrudTableIconDefinition,
} from './app-crud-table.icons';

export interface CrudTableColumn {
  key: string;
  label?: string;
  type?: 'text' | 'badge';
  className?: string;
  value?: (row: any) => unknown;
  cellClass?: (row: any) => string;
  badgeClass?: (row: any) => string;
}

export type CrudTableActionVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'info'
  | 'warning'
  | 'danger'
  | 'light'
  | 'dark';

export interface CrudTableAction {
  id: string;
  label: string;
  icon?: string;
  iconPaths?: string[];
  iconViewBox?: string;
  showLabel?: boolean;
  variant?: CrudTableActionVariant;
  outline?: boolean;
  className?: string;
  disabled?: (row: any) => boolean;
}

export interface CrudTableActionEvent {
  id: string;
  row: any;
}

@Component({
  selector: 'app-crud-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-crud-table.component.html',
  styleUrls: ['./app-crud-table.component.scss'],
})
export class AppCrudTableComponent {
  private readonly iconLibrary = CRUD_TABLE_ICON_LIBRARY;

  @Input() columns: Array<string | CrudTableColumn> = [];
  @Input() rows: any[] = [];
  @Input() emptyMessage = 'No results.';
  @Input() showActions = true;
  @Input() actions: CrudTableAction[] = [];
  @Input() showViewAction = true;
  @Input() showStudyAction = false;
  @Input() showEditAction = true;
  @Input() viewLabel = 'View';
  @Input() studyLabel = 'Study';
  @Input() editLabel = 'Edit';
  @Input() actionsLabel = 'Actions';

  @Output() view = new EventEmitter<any>();
  @Output() study = new EventEmitter<any>();
  @Output() edit = new EventEmitter<any>();
  @Output() action = new EventEmitter<CrudTableActionEvent>();

  get normalizedColumns(): CrudTableColumn[] {
    return this.columns.map((column) => {
      if (typeof column === 'string') {
        return {
          key: column,
          label: this.humanize(column),
          type: 'text',
        };
      }
      return {
        ...column,
        label: column.label || this.humanize(column.key),
        type: column.type ?? 'text',
      };
    });
  }

  get resolvedActions(): CrudTableAction[] {
    if (this.actions?.length) return this.actions;
    const defaults: CrudTableAction[] = [];
    if (this.showViewAction) {
      defaults.push({
        id: 'view',
        label: this.viewLabel,
        icon: 'view',
        variant: 'primary',
        outline: true,
      });
    }
    if (this.showStudyAction) {
      defaults.push({
        id: 'study',
        label: this.studyLabel,
        icon: 'study',
        variant: 'secondary',
        outline: true,
      });
    }
    if (this.showEditAction) {
      defaults.push({
        id: 'edit',
        label: this.editLabel,
        icon: 'edit',
        variant: 'primary',
        outline: false,
      });
    }
    return defaults;
  }

  get hasActionColumn() {
    return this.showActions && this.resolvedActions.length > 0;
  }

  get colSpan() {
    return this.normalizedColumns.length + (this.hasActionColumn ? 1 : 0);
  }

  trackByRow = (index: number, row: any) => row?.['id'] ?? index;
  trackByAction = (_: number, action: CrudTableAction) => action.id;
  trackByPath = (_: number, path: string) => path;

  resolveCellValue(column: CrudTableColumn, row: any) {
    const value = column.value ? column.value(row) : row[column.key];
    return value ?? '';
  }

  resolveCellClass(column: CrudTableColumn, row: any) {
    const extraClass = column.cellClass ? column.cellClass(row) : '';
    return [column.className, extraClass].filter(Boolean).join(' ');
  }

  resolveBadgeClass(column: CrudTableColumn, row: any) {
    return column.badgeClass ? column.badgeClass(row) : '';
  }

  resolveActionButtonClass(action: CrudTableAction) {
    const variant = action.variant ?? 'secondary';
    return action.outline === false ? `btn-${variant}` : `btn-outline-${variant}`;
  }

  resolveActionIcon(action: CrudTableAction): CrudTableIconDefinition | null {
    if (action.iconPaths?.length) {
      return {
        viewBox: action.iconViewBox ?? '0 0 24 24',
        paths: action.iconPaths,
      };
    }
    const rawKey = (action.icon ?? action.id ?? '').toLowerCase();
    const key = CRUD_TABLE_ICON_ALIASES[rawKey] ?? rawKey;
    return this.iconLibrary[key] ?? null;
  }

  showActionLabel(action: CrudTableAction) {
    return action.showLabel ?? !action.icon;
  }

  isActionDisabled(action: CrudTableAction, row: any) {
    return action.disabled ? action.disabled(row) : false;
  }

  onActionClick(action: CrudTableAction, row: any) {
    if (this.isActionDisabled(action, row)) return;
    this.action.emit({ id: action.id, row });
    if (action.id === 'view') this.view.emit(row);
    if (action.id === 'study') this.study.emit(row);
    if (action.id === 'edit') this.edit.emit(row);
  }

  private humanize(key: string) {
    return key
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (ch) => ch.toUpperCase());
  }
}
