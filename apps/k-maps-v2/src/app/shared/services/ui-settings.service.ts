import { Injectable, computed, effect, signal } from '@angular/core';

export type UiOverlayPosition = 'center' | 'top-right';

export interface UiSettingsState {
  obsOverlayEnabled: boolean;
  obsOverlayPosition: UiOverlayPosition;
}

const STORAGE_KEY = 'km_ui_settings_v1';
const DEFAULT_STATE: UiSettingsState = {
  obsOverlayEnabled: false,
  obsOverlayPosition: 'center',
};

@Injectable({ providedIn: 'root' })
export class UiSettingsService {
  private readonly state = signal<UiSettingsState>(this.readInitialState());

  readonly settings = this.state.asReadonly();
  readonly obsOverlayEnabled = computed(() => this.state().obsOverlayEnabled);
  readonly obsOverlayPosition = computed(() => this.state().obsOverlayPosition);

  constructor() {
    effect(() => {
      this.persist(this.state());
    });
  }

  update(partial: Partial<UiSettingsState>): void {
    this.state.update((current) => ({ ...current, ...partial }));
  }

  setObsOverlayEnabled(enabled: boolean): void {
    this.update({ obsOverlayEnabled: enabled });
  }

  setObsOverlayPosition(position: UiOverlayPosition): void {
    this.update({ obsOverlayPosition: position });
  }

  private readInitialState(): UiSettingsState {
    if (typeof window === 'undefined') return DEFAULT_STATE;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_STATE;
      const parsed = JSON.parse(raw) as Partial<UiSettingsState> | null;
      return {
        obsOverlayEnabled: parsed?.obsOverlayEnabled === true,
        obsOverlayPosition: parsed?.obsOverlayPosition === 'top-right' ? 'top-right' : 'center',
      };
    } catch {
      return DEFAULT_STATE;
    }
  }

  private persist(state: UiSettingsState): void {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage failures and keep runtime state only.
    }
  }
}
