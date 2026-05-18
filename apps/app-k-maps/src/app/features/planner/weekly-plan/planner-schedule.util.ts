import { PlannerTaskRow } from '../../../shared/models/planner/sprint.models';

export interface ScheduledTask {
  row: PlannerTaskRow;
  date: string;
}

export function isoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

export function addDays(iso: string, days: number): string {
  const date = parseIsoDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDate(date);
}

export function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

// Planner tasks belong to a sprint week but carry no day-level date.
// Anchor each task to a day: prefer a podcast recording date that falls
// inside the week, otherwise slot tasks evenly across the seven days.
export function scheduleTasks(tasks: PlannerTaskRow[], weekStart: string): ScheduledTask[] {
  const days = weekDates(weekStart);
  const sorted = [...tasks].sort((left, right) => {
    const orderLeft = left.item_json.order_index ?? Number.MAX_SAFE_INTEGER;
    const orderRight = right.item_json.order_index ?? Number.MAX_SAFE_INTEGER;
    if (orderLeft !== orderRight) {
      return orderLeft - orderRight;
    }
    return left.item_json.title.localeCompare(right.item_json.title);
  });

  return sorted.map((row, index) => {
    const recordingAt = row.item_json.assignment?.recording_at;
    const recordingDay = recordingAt ? isoDate(new Date(recordingAt)) : null;
    const date = recordingDay && days.includes(recordingDay)
      ? recordingDay
      : days[index % 7];
    return { row, date };
  });
}

export function groupByDate(scheduled: ScheduledTask[]): Map<string, PlannerTaskRow[]> {
  const grouped = new Map<string, PlannerTaskRow[]>();
  for (const entry of scheduled) {
    const bucket = grouped.get(entry.date) ?? [];
    bucket.push(entry.row);
    grouped.set(entry.date, bucket);
  }
  return grouped;
}
