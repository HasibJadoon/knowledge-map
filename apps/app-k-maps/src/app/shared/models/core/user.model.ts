/**
 * CANONICAL USER
 * Matches `users` table.
 * - Authentication + role
 * - Preferences stored in settings_json
 * - last_seen_at for activity tracking
 */

export interface User {
  entity_type: 'user';
  id: number;

  email: string;
  password_hash: string;

  role: UserRole;

  settings: UserSettings | null;

  last_seen_at: string | null;

  created_at: string;
  updated_at: string | null;
}

export type UserRole = 'admin' | 'editor' | 'user';

export interface UserSettings {
  ui?: UserUISettings;
  study?: UserStudySettings;
  notifications?: UserNotificationSettings;
  defaults?: Record<string, unknown>;
  extra?: Record<string, unknown>;
}

export interface UserUISettings {
  theme?: 'light' | 'dark' | 'system';
  language?: 'en' | 'ar' | 'ur' | 'mixed';
  font_scale?: number;
  layout?: string;
}

export interface UserStudySettings {
  preferred_stream?: 'arabic' | 'worldview' | 'mixed';
  default_difficulty?: number;
  daily_goal_minutes?: number;
  spaced_repetition?: boolean;
}

export interface UserNotificationSettings {
  reminders?: boolean;
  review_alerts?: boolean;
  digest_frequency?: 'daily' | 'weekly' | 'monthly' | 'off';
}

export class UserModel {
  constructor(public data: User) {}
}
