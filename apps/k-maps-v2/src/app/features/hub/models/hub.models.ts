export type HubSection = 'quran' | 'arabic' | 'worldview' | 'workspace';

export type HubPanelMode =
  // Quran
  | 'surah' | 'passage' | 'surah-note'
  // Arabic
  | 'ar-container' | 'ar-unit' | 'ar-task' | 'ar-grammar' | 'ar-balagha' | 'ar-domain' | 'ar-domain-phrase' | 'ar-vocab' | 'ar-srs'
  // Worldview
  | 'wv-worldview' | 'wv-topic' | 'wv-source' | 'wv-source-unit' | 'wv-highlight' | 'wv-note' | 'wv-brainstorm' | 'wv-comparison' | 'wv-person' | 'wv-podcast' | 'wv-plan' | 'wv-plan-item'
  // Workspace
  | 'workspace' | 'ws-member' | 'ws-task' | 'ws-doc' | 'ws-activity'
  | 'none';

export interface HubCard {
  id: string;
  icon: string;
  glyph?: string;
  title: string;
  description: string;
  table: string;
  route: string;
  panelMode: HubPanelMode;
  badge?: 'NEW' | 'UPDATED' | null;
  countKey?: string;
  accentColor?: string;
  tag: string;
}

export interface HubSectionDef {
  id: HubSection;
  icon: string;
  glyph: string;
  title: string;
  subtitle: string;
  description: string;
  tag: string;
  accentColor: string;
  route: string;
}

export interface PanelState {
  open: boolean;
  mode: HubPanelMode;
  context: Record<string, unknown>;
  title: string;
}
