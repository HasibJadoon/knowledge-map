import { Injectable, signal } from '@angular/core';

import { KmapsSource, KmapsSourceUnit } from '../../features/kmaps/kmaps-shared/models/kmaps.models';
import { WvPlannerTaskDraft } from '../../features/kmaps/kmaps-shared/models/wv-workspace.models';

@Injectable({ providedIn: 'root' })
export class WvPlannerService {
  private readonly tasksState = signal<WvPlannerTaskDraft[]>([]);

  readonly tasks = this.tasksState.asReadonly();

  getTasksForUnit(unitId: string): WvPlannerTaskDraft[] {
    return this.tasksState().filter((task) => task.unitId === unitId);
  }

  ensureTasksForUnit(source: KmapsSource, unit: KmapsSourceUnit): WvPlannerTaskDraft[] {
    const existing = this.getTasksForUnit(unit.id);
    if (existing.length) {
      return existing;
    }

    const createdAt = new Date().toISOString();
    const tasks: WvPlannerTaskDraft[] = [
      {
        id: createId('wv-task'),
        unitId: unit.id,
        sourceId: source.id,
        title: `Distill ${unit.title} into worldview nodes`,
        lane: 'todo',
        relatedTarget: 'distill',
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: createId('wv-task'),
        unitId: unit.id,
        sourceId: source.id,
        title: `Write lesson draft for ${unit.title}`,
        lane: 'todo',
        relatedTarget: 'document',
        createdAt,
        updatedAt: createdAt,
      },
    ];

    this.tasksState.update((current) => [...tasks, ...current]);
    return tasks;
  }

  updateLane(taskId: string, lane: WvPlannerTaskDraft['lane']): void {
    const updatedAt = new Date().toISOString();
    this.tasksState.update((tasks) => tasks.map((task) => (task.id === taskId ? { ...task, lane, updatedAt } : task)));
  }
}

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}
