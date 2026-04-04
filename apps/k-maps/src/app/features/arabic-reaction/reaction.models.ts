// ─────────────────────────────────────────────────────────────────────────────
// Reaction Studio — domain models
// ─────────────────────────────────────────────────────────────────────────────

/** A named segment of the video (e.g. "Introduction", "Main Argument"). */
export interface Scene {
  id: string;
  title: string;
  /** Start time in seconds */
  start: number;
  /** End time in seconds */
  end: number;
}

/** One line in the transcript, synced to a time range and a scene. */
export interface TranscriptLine {
  id: string;
  /** Start time in seconds */
  start: number;
  /** End time in seconds */
  end: number;
  /** Arabic (or mixed) text displayed in the panel */
  text: string;
  /** Which scene this line belongs to */
  sceneId: string;
}

/** A vocabulary entry shown in the right panel for the active scene. */
export interface VocabItem {
  id: string;
  word: string;
  meaning: string;
  root?: string;
  example?: string;
}

/** An idiom or collocated phrase for the active scene. */
export interface IdiomItem {
  id: string;
  phrase: string;
  meaning: string;
  context?: string;
}

/** A key sentence worth studying in depth. */
export interface SentenceItem {
  id: string;
  text: string;
  translation: string;
  note?: string;
}

/** All right-panel content associated with a single scene. */
export interface SceneContent {
  sceneId: string;
  vocab: VocabItem[];
  idioms: IdiomItem[];
  sentences: SentenceItem[];
  notes?: string;
}

/** Top-level data blob for one Reaction Studio lesson. */
export interface ReactionLessonData {
  unitId: string;
  title: string;
  /** YouTube video ID (the part after ?v=) */
  youtubeId: string;
  scenes: Scene[];
  transcript: TranscriptLine[];
  /** One SceneContent per scene; keyed by sceneId */
  content: SceneContent[];
}
