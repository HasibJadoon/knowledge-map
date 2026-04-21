/**
 * CANONICAL USER STATE
 * Purpose:
 * - Stores the user’s current working context
 * - Restores UI + cognitive state across sessions
 * - Exactly mirrors `user_state` table
 */

export interface UserState {
  entity_type: 'user_state';
  user_id: number;
  current_type: UserStateTargetType | null;
  current_id: string | null;
  current_unit_id: string | null;
  focus_mode: UserFocusMode | null;
  state: UserStatePayload | null;
  updated_at: string;
}

export type UserStateTargetType =
  | 'ar_lesson'
  | 'worldview_claim'
  | 'brainstorm_session'
  | 'content_item'
  | 'library_entry'
  | 'concept'
  | 'lexicon_entry'
  | 'root'
  | 'other';

export type UserFocusMode =
  | 'reading'
  | 'extracting'
  | 'memorizing'
  | 'writing'
  | 'reviewing'
  | 'planning'
  | 'idle';

export interface UserStatePayload {
  open_panes?: string[];
  active_filters?: Record<string, any>;
  scroll_position?: number;
  selected_ids?: string[];
  view_mode?: string;
  ui_flags?: Record<string, boolean>;
  extra?: Record<string, unknown>;
}

export class UserStateModel {
  constructor(public data: UserState) {}
}
