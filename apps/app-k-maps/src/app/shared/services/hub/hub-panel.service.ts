import { Injectable, signal, computed } from '@angular/core';
import { HubPanelMode, PanelState } from '../../../features/hub/models/hub.models';

@Injectable({ providedIn: 'root' })
export class HubPanelService {
  private _state = signal<PanelState>({ open: false, mode: 'none', context: {}, title: '' });

  readonly state = this._state.asReadonly();
  readonly isOpen = computed(() => this._state().open);
  readonly mode = computed(() => this._state().mode);
  readonly context = computed(() => this._state().context);

  open(mode: HubPanelMode, title: string, context: Record<string, unknown> = {}): void {
    this._state.set({ open: true, mode, context, title });
  }

  close(): void {
    this._state.update(s => ({ ...s, open: false }));
  }

  updateContext(context: Record<string, unknown>): void {
    this._state.update(s => ({ ...s, context: { ...s.context, ...context } }));
  }
}
