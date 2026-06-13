import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  TextToSpeech,
  QueueStrategy,
  type SpeechSynthesisVoice as NativeVoice,
} from '@capacitor-community/text-to-speech';

export interface SpeechSegment {
  /** Sentence-sized chunk of text to speak. */
  text: string;
  /** Index of the reading block this chunk belongs to (for highlighting). */
  blockIndex: number;
}

/** One reading block's start/end offset inside a pre-rendered audio track. */
export interface AudioTiming {
  blockIndex: number;
  startMs: number;
  endMs: number;
}

export type ReadAloudState = 'idle' | 'playing' | 'paused';
type Engine = 'tts' | 'track';

const VOICE_PREF_KEY = 'kmaps.readAloud.voice';

/**
 * Read-aloud with two engines behind one API:
 *
 * - On a real device (Capacitor iOS/Android) it uses the native
 *   `@capacitor-community/text-to-speech` plugin, which drives the platform's
 *   own high-quality system voices (Siri / Google) and sounds human rather
 *   than the robotic "ghost" voice the in-WebView Web Speech engine produces.
 * - On the web it falls back to the Web Speech API (`speechSynthesis`), picking
 *   the best installed system voice.
 *
 * Either way text is spoken block-by-block (short blocks whole, long blocks in
 * ~220-char chunks — handled by the caller) so prosody stays natural and we can
 * highlight the active block as it is read.
 */
@Injectable({ providedIn: 'root' })
export class ReadAloudService {
  private readonly native = Capacitor.isNativePlatform();
  private readonly synth: SpeechSynthesis | null =
    !this.native && typeof window !== 'undefined' && 'speechSynthesis' in window
      ? window.speechSynthesis
      : null;

  private voice: SpeechSynthesisVoice | null = null;
  private nativeVoices: NativeVoice[] = [];
  private nativeVoiceIndex: number | null = null;
  private preferredVoiceName: string | null = null;
  private segments: SpeechSegment[] = [];
  private cursor = 0;
  private keepAlive: ReturnType<typeof setInterval> | null = null;
  private voicePollCount = 0;
  /** Bumped on every (re)start so an in-flight native loop knows to bail. */
  private playId = 0;

  /** Active engine: live TTS, or a pre-rendered HQ audio track. */
  private engine: Engine = 'tts';
  private audio: HTMLAudioElement | null = null;
  private trackTimings: AudioTiming[] = [];

  readonly supported = this.native || !!this.synth;
  readonly state = signal<ReadAloudState>('idle');
  readonly activeBlock = signal<number>(-1);
  readonly rate = signal<number>(1);

  constructor() {
    this.preferredVoiceName = this.loadPreferredVoiceName();
    if (this.native) {
      void this.loadNativeVoices();
      return;
    }
    if (!this.synth) return;
    this.pickVoice();
    // Voice list is populated asynchronously on most browsers; inside the
    // Capacitor webview it can arrive late or only after a few ticks, so we
    // both listen for the event and poll briefly until a voice is resolved.
    this.synth.onvoiceschanged = () => this.pickVoice();
    this.pollForVoices();
  }

  // ── Native engine ──────────────────────────────────────────────────────────

  private async loadNativeVoices(): Promise<void> {
    try {
      const { voices } = await TextToSpeech.getSupportedVoices();
      this.nativeVoices = voices ?? [];
      this.nativeVoiceIndex = this.pickNativeVoiceIndex();
    } catch {
      this.nativeVoices = [];
      this.nativeVoiceIndex = null;
    }
  }

  /** Index (into getSupportedVoices) of the most natural English device voice. */
  private pickNativeVoiceIndex(): number | null {
    if (!this.nativeVoices.length) return null;

    if (this.preferredVoiceName) {
      const idx = this.nativeVoices.findIndex((v) => v.name === this.preferredVoiceName);
      if (idx >= 0) return idx;
    }

    let bestIdx: number | null = null;
    let bestScore = -Infinity;
    this.nativeVoices.forEach((v, idx) => {
      if (!v.lang?.toLowerCase().startsWith('en')) return;
      const s = scoreVoice(v.name, v.voiceURI ?? '', v.lang, v.localService);
      if (s > bestScore) { bestScore = s; bestIdx = idx; }
    });

    if (bestIdx !== null) return bestIdx;
    // No English voice flagged — fall back to the first available voice.
    return this.nativeVoices.length ? 0 : null;
  }

  /** Sequentially speak segments via the native plugin from the current cursor. */
  private async runNativeLoop(): Promise<void> {
    const myId = this.playId;
    while (this.cursor < this.segments.length) {
      if (this.playId !== myId || this.state() !== 'playing') return;

      const segment = this.segments[this.cursor];
      this.activeBlock.set(segment.blockIndex);

      try {
        await TextToSpeech.speak({
          text: segment.text,
          lang: this.nativeVoices[this.nativeVoiceIndex ?? -1]?.lang ?? 'en-US',
          rate: this.rate(),
          pitch: 1,
          volume: 1,
          // `playback` keeps audio going if the screen locks; `Flush` makes a
          // new speak() interrupt cleanly (used by pause/stop/restart).
          category: 'playback',
          voice: this.nativeVoiceIndex ?? undefined,
          queueStrategy: QueueStrategy.Flush,
        });
      } catch {
        // stop()/pause() rejects the in-flight speak — bail if superseded.
        if (this.playId !== myId || this.state() !== 'playing') return;
      }

      if (this.playId !== myId || this.state() !== 'playing') return;
      this.cursor += 1;
    }

    if (this.playId === myId) this.stop();
  }

  // ── Web engine ─────────────────────────────────────────────────────────────

  /**
   * Some webviews report no voices on the first tick and never fire
   * `onvoiceschanged`. Poll a handful of times so we still land on a real voice.
   */
  private pollForVoices(): void {
    if (!this.synth) return;
    if (this.voice || this.voicePollCount >= 10) return;
    this.voicePollCount += 1;
    setTimeout(() => {
      this.pickVoice();
      this.pollForVoices();
    }, 250);
  }

  /** Choose the most natural-sounding English voice available. */
  private pickVoice(): void {
    if (!this.synth) return;
    const all = this.synth.getVoices();
    if (!all.length) return;

    // Honour an explicit user choice first.
    if (this.preferredVoiceName) {
      const chosen = all.find((v) => v.name === this.preferredVoiceName);
      if (chosen) { this.voice = chosen; return; }
    }

    const english = all.filter((v) => v.lang?.toLowerCase().startsWith('en'));
    if (!english.length) return;

    this.voice =
      [...english].sort(
        (a, b) =>
          scoreVoice(b.name, b.voiceURI, b.lang, b.localService) -
          scoreVoice(a.name, a.voiceURI, a.lang, a.localService),
      )[0] ?? english[0];
  }

  private speakCurrent(): void {
    if (!this.synth) return;
    if (this.cursor >= this.segments.length) {
      this.stop();
      return;
    }

    const segment = this.segments[this.cursor];
    this.activeBlock.set(segment.blockIndex);

    const utterance = new SpeechSynthesisUtterance(segment.text);
    if (this.voice) {
      utterance.voice = this.voice;
      utterance.lang = this.voice.lang;
    } else {
      // No resolved voice yet — at least pin the language so the engine does
      // not fall back to a wrong-language robotic default.
      utterance.lang = 'en-US';
    }
    utterance.rate = this.rate();
    utterance.pitch = 1;
    utterance.onend = () => {
      if (this.state() === 'idle') return;
      this.cursor += 1;
      this.speakCurrent();
    };
    utterance.onerror = () => {
      if (this.state() === 'idle') return;
      this.cursor += 1;
      this.speakCurrent();
    };

    this.synth.speak(utterance);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Names of available English voices (best first) for an optional picker. */
  englishVoices(): { name: string; lang: string }[] {
    if (this.native) {
      return this.nativeVoices
        .filter((v) => v.lang?.toLowerCase().startsWith('en'))
        .map((v) => ({ name: v.name, lang: v.lang }));
    }
    if (!this.synth) return [];
    return this.synth
      .getVoices()
      .filter((v) => v.lang?.toLowerCase().startsWith('en'))
      .map((v) => ({ name: v.name, lang: v.lang }));
  }

  setVoiceByName(name: string): void {
    if (this.native) {
      const idx = this.nativeVoices.findIndex((v) => v.name === name);
      if (idx < 0) return;
      this.nativeVoiceIndex = idx;
    } else {
      const match = this.synth?.getVoices().find((v) => v.name === name);
      if (!match) return;
      this.voice = match;
    }
    this.preferredVoiceName = name;
    this.savePreferredVoiceName(name);
  }

  currentVoiceName(): string {
    if (this.native) return this.nativeVoices[this.nativeVoiceIndex ?? -1]?.name ?? '';
    return this.voice?.name ?? '';
  }

  /** Begin reading the given ordered segments, optionally from a chosen block. */
  start(segments: SpeechSegment[], fromBlockIndex = 0): void {
    if (!this.supported || !segments.length) return;
    this.teardownTrack();
    this.engine = 'tts';
    this.segments = segments;
    // Snap to the first segment at or after the requested block so a tap on a
    // paragraph begins reading from there, while the default (0) starts at the top.
    const startAt = segments.findIndex((s) => s.blockIndex >= fromBlockIndex);
    this.cursor = startAt < 0 ? 0 : startAt;
    this.state.set('playing');
    this.playId += 1;

    if (this.native) {
      void TextToSpeech.stop().finally(() => void this.runNativeLoop());
      return;
    }
    this.synth?.cancel();
    this.startKeepAlive();
    this.speakCurrent();
  }

  /** Restart playback from a specific reading block (e.g. a tapped paragraph). */
  startFromBlock(segments: SpeechSegment[], blockIndex: number): void {
    this.start(segments, blockIndex);
  }

  // ── Pre-rendered HQ audio track ─────────────────────────────────────────────

  /** True once a track has been loaded for the current unit. */
  get hasTrack(): boolean {
    return this.engine === 'track' && !!this.audio;
  }

  /**
   * Play a pre-rendered narration MP3 (Speechify-style) and drive the
   * block-by-block highlight from its timing map, optionally starting at a
   * given block. This is the highest-quality path: one fluent, natural voice
   * regardless of device, with the active line following the audio.
   */
  playTrack(url: string, timings: AudioTiming[], fromBlockIndex = 0): void {
    if (!url || typeof Audio === 'undefined') return;
    // Switch engines cleanly.
    this.synth?.cancel();
    this.stopKeepAlive();
    if (this.native) void TextToSpeech.stop();
    this.engine = 'track';
    this.trackTimings = [...timings].sort((a, b) => a.startMs - b.startMs);

    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = 'auto';
      this.audio.addEventListener('timeupdate', () => this.syncTrackHighlight());
      this.audio.addEventListener('ended', () => this.stop());
    }
    if (this.audio.src !== url) this.audio.src = url;
    this.audio.playbackRate = this.rate();

    const startMs = this.trackTimings.find((t) => t.blockIndex >= fromBlockIndex)?.startMs ?? 0;
    const seekAndPlay = () => {
      try { this.audio!.currentTime = startMs / 1000; } catch { /* not seekable yet */ }
      void this.audio!.play().then(() => this.state.set('playing')).catch(() => this.state.set('idle'));
    };
    if (this.audio.readyState >= 1) {
      seekAndPlay();
    } else {
      this.audio.addEventListener('loadedmetadata', seekAndPlay, { once: true });
      this.audio.load();
    }
  }

  /** Seek the loaded track to a tapped block and keep playing. */
  startTrackFromBlock(url: string, timings: AudioTiming[], blockIndex: number): void {
    this.playTrack(url, timings, blockIndex);
  }

  private syncTrackHighlight(): void {
    if (!this.audio) return;
    const ms = this.audio.currentTime * 1000;
    // Timings are sorted; pick the last block whose start is at/under now.
    let active = -1;
    for (const t of this.trackTimings) {
      if (ms >= t.startMs) active = t.blockIndex; else break;
    }
    if (active !== this.activeBlock()) this.activeBlock.set(active);
  }

  private teardownTrack(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load();
      this.audio = null;
    }
    this.trackTimings = [];
  }

  pause(): void {
    if (this.state() !== 'playing') return;
    this.state.set('paused');
    if (this.engine === 'track') {
      this.audio?.pause();
      return;
    }
    if (this.native) {
      // No native pause — stop the engine and stay on the current segment so
      // resume re-speaks it from the top.
      this.playId += 1;
      void TextToSpeech.stop();
      return;
    }
    this.synth?.pause();
  }

  resume(): void {
    if (this.state() !== 'paused') return;
    this.state.set('playing');
    if (this.engine === 'track') {
      void this.audio?.play().catch(() => this.state.set('paused'));
      return;
    }
    if (this.native) {
      this.playId += 1;
      void this.runNativeLoop();
      return;
    }
    this.synth?.resume();
  }

  toggle(segments: SpeechSegment[]): void {
    switch (this.state()) {
      case 'playing':
        this.pause();
        break;
      case 'paused':
        this.resume();
        break;
      default:
        this.start(segments);
    }
  }

  stop(): void {
    this.state.set('idle');
    this.activeBlock.set(-1);
    this.cursor = 0;
    this.segments = [];
    this.playId += 1;
    if (this.engine === 'track') {
      this.teardownTrack();
      return;
    }
    if (this.native) {
      void TextToSpeech.stop();
      return;
    }
    this.stopKeepAlive();
    this.synth?.cancel();
  }

  /** Change playback speed; applies immediately for a track, next segment for TTS. */
  setRate(rate: number): void {
    const clamped = Math.min(2, Math.max(0.6, rate));
    this.rate.set(clamped);
    if (this.engine === 'track' && this.audio) this.audio.playbackRate = clamped;
  }

  // ── Web keep-alive + voice preference storage ───────────────────────────────

  /**
   * Chromium-based webviews silently stop `speechSynthesis` after ~15s of
   * continuous audio, which sounds like the voice "ghosting" out mid-read.
   * A periodic pause/resume keeps the queue alive without audible artefacts.
   */
  private startKeepAlive(): void {
    this.stopKeepAlive();
    this.keepAlive = setInterval(() => {
      if (!this.synth || this.state() !== 'playing') return;
      this.synth.pause();
      this.synth.resume();
    }, 12000);
  }

  private stopKeepAlive(): void {
    if (this.keepAlive !== null) {
      clearInterval(this.keepAlive);
      this.keepAlive = null;
    }
  }

  private loadPreferredVoiceName(): string | null {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(VOICE_PREF_KEY) : null;
    } catch {
      return null;
    }
  }

  private savePreferredVoiceName(name: string): void {
    try {
      localStorage?.setItem(VOICE_PREF_KEY, name);
    } catch {
      /* storage unavailable — keep the in-memory preference only */
    }
  }
}

/** Rank a voice by how natural it is likely to sound; higher is better. */
function scoreVoice(name: string, voiceURI: string, lang: string, localService: boolean): number {
  const tag = `${name} ${voiceURI}`.toLowerCase();
  let s = 0;
  if (/(enhanced|premium|neural|natural|siri)/.test(tag)) s += 100; // top-tier device voices
  if (/google/.test(tag)) s += 60;                                   // Google's natural voices
  if (/(samantha|ava|allison|zoe|serena|daniel|karen|moira|tessa|aaron|nicky|evan)/.test(tag)) s += 30;
  if (/microsoft/.test(tag) && /(online|natural)/.test(tag)) s += 50;
  if (/(en-us|en-gb)/.test(lang.toLowerCase())) s += 20;
  if (localService) s += 10;
  // Demote the unmistakably robotic engines that produce the "ghost" voice.
  if (/(compact|eloquence|espeak|pico|robot|fred|albert|zarvox|trinoids|whisper|bells|bahh|deranged|hysterical|cellos|bad news|good news)/.test(tag)) s -= 120;
  return s;
}
