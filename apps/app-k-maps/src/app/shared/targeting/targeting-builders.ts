import { TargetRef, makeTaskItemTarget, makeTaskTarget } from './targeting.models';

export function buildTaskTargetSafe(unitId: string, taskType: string, rangeRef: string): TargetRef | null {
  const task = taskType.trim();
  if (!task) return null;

  const unit = resolveUnitId(unitId, task, rangeRef);
  const range = rangeRef.trim();
  const refText = range ? `${range} • ${task}` : task;

  try {
    return makeTaskTarget(unit, task, refText);
  } catch {
    return null;
  }
}

export function buildTaskItemTargetSafe(
  unitId: string,
  taskType: string,
  itemKey: string,
  itemRefLabel: string,
  rangeRef: string
): TargetRef | null {
  const task = taskType.trim();
  const item = itemKey.trim();
  if (!task || !item) return null;

  const unit = resolveUnitId(unitId, task, rangeRef);
  const label = itemRefLabel.trim();
  const range = rangeRef.trim();
  const refText = range ? `${range} • ${label}` : label;

  try {
    return makeTaskItemTarget(unit, task, item, refText);
  } catch {
    return null;
  }
}

function resolveUnitId(unitId: string, taskType: string, rangeRef: string): string {
  const explicit = unitId.trim();
  if (explicit) return explicit;

  const normalizedRange = rangeRef
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 72);

  if (normalizedRange) {
    return `range_${taskType}_${normalizedRange}`;
  }

  return `legacy_${taskType}`;
}
