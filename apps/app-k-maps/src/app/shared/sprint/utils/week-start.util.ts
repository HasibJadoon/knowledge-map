const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const sydneyDateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Australia/Sydney',
  weekday: 'short',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function toIsoDate(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeInput(input?: string | Date | number | null): Date {
  if (input instanceof Date) {
    return new Date(input.getTime());
  }

  if (typeof input === 'number' && Number.isFinite(input)) {
    return new Date(input);
  }

  if (typeof input === 'string' && input.trim()) {
    const trimmed = input.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return new Date(`${trimmed}T12:00:00Z`);
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
}

export function computeWeekStartSydney(input?: string | Date | number | null): string {
  const date = normalizeInput(input);
  const parts = sydneyDateFormatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value ?? '');
  const month = Number(parts.find((part) => part.type === 'month')?.value ?? '');
  const day = Number(parts.find((part) => part.type === 'day')?.value ?? '');
  const weekdayToken = parts.find((part) => part.type === 'weekday')?.value ?? 'Mon';
  const weekday = WEEKDAY_INDEX[weekdayToken] ?? 1;

  const anchor = new Date(Date.UTC(year || 1970, (month || 1) - 1, day || 1));
  const daysFromMonday = (weekday + 6) % 7;
  anchor.setUTCDate(anchor.getUTCDate() - daysFromMonday);
  return toIsoDate(anchor);
}

export function formatWeekRangeLabel(weekStart: string): string {
  const start = new Date(`${weekStart}T12:00:00Z`);
  const end = new Date(start.getTime());
  end.setUTCDate(end.getUTCDate() + 6);

  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}
