// ─── Episode Studio — shared models ───────────────────────────────────────────
// Mirrors the km-studio (ST) worker API shapes. An episode is the authored
// aggregate: ordered sections, each owning ordered talking points, with each
// point optionally assigned to one participant.

export type EpisodeFormat =
  | 'podcast' | 'tutorial' | 'talking_head' | 'conversation' | 'solo';

export type SectionType =
  | 'intro' | 'main_point' | 'discussion' | 'conclusion' | 'custom';

export type ParticipantRole = 'host' | 'speaker' | 'guest' | 'viewer';

export type EpisodeStatus = 'draft' | 'live' | 'done';

export interface StudioTemplate {
  id: string;
  name: string;
  description: string | null;
  format: EpisodeFormat;
  is_builtin: boolean;
  structure: unknown;
  created_at: string;
  updated_at: string;
}

export interface EpisodeSummary {
  id: string;
  core_user_ref: string;
  title: string;
  format: EpisodeFormat;
  template_ref: string | null;
  status: EpisodeStatus;
  created_at: string;
  updated_at: string;
}

export interface Participant {
  id: string;
  episode_ref: string;
  display_name: string;
  color: string;
  role: ParticipantRole;
  seq: number;
}

export interface TalkingPoint {
  id: string;
  section_ref: string;
  episode_ref: string;
  text: string;
  speaker_ref: string | null;
  est_seconds: number | null;
  seq: number;
}

export interface Section {
  id: string;
  episode_ref: string;
  type: SectionType;
  heading: string;
  seq: number;
  points: TalkingPoint[];
}

export interface EpisodeAggregate extends EpisodeSummary {
  participants: Participant[];
  sections: Section[];
}

export const EPISODE_FORMATS: ReadonlyArray<{ id: EpisodeFormat; label: string }> = [
  { id: 'podcast',      label: 'Podcast' },
  { id: 'conversation', label: 'Conversation' },
  { id: 'tutorial',     label: 'Tutorial' },
  { id: 'talking_head', label: 'Talking head' },
  { id: 'solo',         label: 'Solo' },
];

export function formatLabel(format: string): string {
  return EPISODE_FORMATS.find((f) => f.id === format)?.label ?? format;
}
