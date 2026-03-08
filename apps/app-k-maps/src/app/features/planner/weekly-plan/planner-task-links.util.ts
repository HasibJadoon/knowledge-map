import { PlannerTaskRow } from '../../sprint/models/sprint.models';

const PODCAST_RELATED_TYPES = new Set([
  'wv_content_item',
  'podcast_episode',
  'podcast',
]);

export function linkedPodcastEpisodeId(task: PlannerTaskRow): string | null {
  const relatedId = task.related_id?.trim();
  if (!relatedId) {
    return null;
  }

  const relatedType = task.related_type?.trim().toLowerCase();
  if (relatedType && PODCAST_RELATED_TYPES.has(relatedType)) {
    return relatedId;
  }

  return task.item_json.assignment.kind === 'podcast' || task.item_json.lane === 'podcast'
    ? relatedId
    : null;
}
