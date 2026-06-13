import { Injectable, signal } from '@angular/core';

export interface SpeechSegment {
  /** Sentence-sized chunk of text to speak. */
  text: string;
  /** Index of the reading block this chunk belongs to (for highlighting). */
  blockIndex: number;
}

export type ReadAloudState = 'idle' | 'playing' | 'paused';

const VOICE_PREF_KEY = 'kmaps.readAloud.voice';

/**
 * Read-aloud built on the Web Speech API (`speechSynthesis`).
 *
 * This deliberately uses the platform's own voices: inside the Capacitor
 * iOS/Android webview these resolve to the device's high-quality neural
 * voices (e.g. iOS "Enhanced"/Siri voices, Google voices on Android), and on
 * the web to the best installed system voice. It is free, offline, open, and
 * needs no API keys — and it sounds natural rather than robotic because we
 * pick the highest-quality English voice the device offers.
 *
 * Text is spoken sentence-by-sentence to avoid the long-utterance cut-off some
 * browsers impose, and to drive fine-grained highlighting of the active block.
 */
@Injectable({ providedIn: 'root' })
export class ReadAloudService {
  private readonly synth: SpeechSynthesis | null =
    typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;

  private voice: SpeechSynthesisVoice | null = null;
  private preferredVoiceName: string | null = null;
  private segments: SpeechSegment[] = [];
  private cursor = 0;
  private keepAlive: ReturnType<typeof setInterval> | null = null;
  private voicePollCount = 0;

  readonly supported = !!this.synth;
  readonly state = signal<ReadAloudState>('idle');
  readonly activeBlock = signal<number>(-1);
  readonly rate = signal<number>(1);

  constructor() {
    if (!this.synth) return;
    this.preferredVoiceName = this.loadPreferredVoiceName();
    this.pickVoice();
    // Voice list is populated asynchronously on most browsers; inside the
    // Capacitor webview it can arrive late or only after a few ticks, so we
    // both listen for the event and poll briefly until a voice is resolved.
    this.synth.onvoiceschanged = () => this.pickVoice();
    this.pollForVoices();
  }

  /**
   * Some webviews (notably Capacitor on Android) report no voices on the first
   * tick and never fire `onvoiceschanged`. Poll a handful of times so we still
   * land on a real device voice instead of the robotic default.
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

    const score = (v: SpeechSynthesisVoice): number => {
      const tag = `${v.name} ${v.voiceURI}`.toLowerCase();
      let s = 0;
      if (/(enhanced|premium|neural|natural|siri)/.test(tag)) s += 100; // top-tier device voices
      if (/google/.test(tag)) s += 60;                                   // Google's natural voices
      if (/(samantha|ava|allison|zoe|serena|daniel|karen|moira|tessa|aaron|nicky|evan)/.test(tag)) s += 30;
      if (/microsoft/.test(tag) && /(online|natural)/.test(tag)) s += 50;
      if (/(en-us|en-gb)/.test(v.lang.toLowerCase())) s += 20;
      if (v.localService) s += 10;
      // Demote the unmistakably robotic engines that produce the "ghost" voice.
      if (/(compact|eloquence|espeak|pico|robot|fred|albert|zarvox|trinoids|whisper|bells|bahh|deranged|hysterical|cellos|bad news|good news)/.test(tag)) s -= 120;
      return s;
    };

    this.voice = [...english].sort((a, b) => score(b) - score(a))[0] ?? english[0];
  }

  /** Names of available English voices (best first) for an optional picker. */
  englishVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices().filter((v) => v.lang?.toLowerCase().startsWith('en'));
  }

  setVoiceByName(name: string): void {
    const match = this.englishVoices().find((v) => v.name === name);
    if (match) {
      this.voice = match;
      this.preferredVoiceName = name;
      this.savePreferredVoiceName(name);
    }
  }

  currentVoiceName(): string {
    return this.voice?.name ?? '';
  }

  /** Begin reading the given ordered segments, optionally from a chosen block. */
  start(segments: SpeechSegment[], fromBlockIndex = 0): void {
    if (!this.synth || !segments.length) return;
    this.synth.cancel();
    this.segments = segments;
    // Snap to the first segment at or after the requested block so a tap on a
    // paragraph begins reading from there, while the default (0) starts at the top.
    const startAt = segments.findIndex((s) => s.blockIndex >= fromBlockIndex);
    this.cursor = startAt < 0 ? 0 : startAt;
    this.state.set('playing');
    this.startKeepAlive();
    this.speakCurrent();
  }

  /** Restart playback from a specific reading block (e.g. a tapped paragraph). */
  startFromBlock(segments: SpeechSegment[], blockIndex: number): void {
    this.start(segments, blockIndex);
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

  pause(): void {
    if (!this.synth || this.state() !== 'playing') return;
    this.synth.pause();
    this.state.set('paused');
  }

  resume(): void {
    if (!this.synth || this.state() !== 'paused') return;
    this.synth.resume();
    this.state.set('playing');
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
    this.stopKeepAlive();
    this.synth?.cancel();
  }

  /** Change playback speed; applies from the next sentence. */
  setRate(rate: number): void {
    this.rate.set(Math.min(2, Math.max(0.6, rate)));
  }

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
