export type TargetType = 'task' | 'task_item' | 'quran_ayah' | 'quran_word';

export interface TargetRef {
  target_type: TargetType;
  target_id: string;
  ref?: string;
}

export interface CaptureNote {
  id: string;
  body_md: string;
  title?: string | null;
  status: 'inbox' | 'archived';
  created_at: string;
  updated_at: string;
}

export function computeTitleFromMarkdown(body_md: string): string | null {
  const firstLine = body_md
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine) {
    return null;
  }

  const cleaned = firstLine
    .replace(/^#{1,6}\s+/, '')
    .replace(/^[-*+]\s+/, '')
    .replace(/^\d+\.\s+/, '')
    .trim();

  if (!cleaned) {
    return null;
  }

  return cleaned.length > 120 ? `${cleaned.slice(0, 117).replace(/\s+$/, '')}...` : cleaned;
}

export function makeTaskTarget(unit_id: string, task_type: string, refText: string): TargetRef {
  const unit = unit_id.trim();
  const task = task_type.trim();
  if (!unit || !task) {
    throw new Error('Task target needs unit_id and task_type.');
  }

  const ref = refText.trim();
  return {
    target_type: 'task',
    target_id: `TASK:${unit}:${task}`,
    ref: ref || undefined,
  };
}

export function makeTaskItemTarget(
  unit_id: string,
  task_type: string,
  item_key: string,
  refText: string
): TargetRef {
  const unit = unit_id.trim();
  const task = task_type.trim();
  const item = item_key.trim();

  if (!unit || !task || !item) {
    throw new Error('Task item target needs unit_id, task_type, and item_key.');
  }

  const ref = refText.trim();
  return {
    target_type: 'task_item',
    target_id: `TASKITEM:${unit}:${task}:${item}`,
    ref: ref || undefined,
  };
}

export function makeWordTarget(surah: number, ayah: number, token_index: number): TargetRef {
  const surahNum = Math.trunc(surah);
  const ayahNum = Math.trunc(ayah);
  const tokenNum = Math.trunc(token_index);

  if (!Number.isFinite(surahNum) || !Number.isFinite(ayahNum) || !Number.isFinite(tokenNum)) {
    throw new Error('Word target needs numeric surah, ayah, and token_index.');
  }

  if (surahNum < 1 || surahNum > 114) {
    throw new Error('Surah must be 1..114.');
  }

  if (ayahNum < 1 || ayahNum > 286) {
    throw new Error('Ayah must be 1..286.');
  }

  if (tokenNum < 1 || tokenNum > 400) {
    throw new Error('Token index must be 1..400.');
  }

  const ref = `${surahNum}:${ayahNum}:${tokenNum}`;
  return {
    target_type: 'quran_word',
    target_id: `QW:${ref}`,
    ref,
  };
}

export function makeAyahTarget(surah: number, ayah: number): TargetRef {
  const surahNum = Math.trunc(surah);
  const ayahNum = Math.trunc(ayah);

  if (!Number.isFinite(surahNum) || !Number.isFinite(ayahNum)) {
    throw new Error('Ayah target needs numeric surah and ayah.');
  }

  if (surahNum < 1 || surahNum > 114) {
    throw new Error('Surah must be 1..114.');
  }

  if (ayahNum < 1 || ayahNum > 286) {
    throw new Error('Ayah must be 1..286.');
  }

  const ref = `${surahNum}:${ayahNum}`;
  return {
    target_type: 'quran_ayah',
    target_id: `Q:${ref}`,
    ref,
  };
}
