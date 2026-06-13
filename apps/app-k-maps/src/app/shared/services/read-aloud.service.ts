import { Injectable, signal } from '@angular/core';

export interface SpeechSegment {
  /** Sentence-sized chunk of text to speak. */
  text: string;
  /** Index of the reading block this chunk belongs to (for highlighting). */
  blockIndex: number;
}

export type ReadAloudState = 'idle' | 'playing' | 'paused';

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
  private segments: SpeechSegment[] = [];
  private cursor = 0;

  readonly supported = !!this.synth;
  readonly state = signal<ReadAloudState>('idle');
  readonly activeBlock = signal<number>(-1);
  readonly rate = signal<number>(1);

  constructor() {
    if (!this.synth) return;
    this.pickVoice();
    // Voice list is populated asynchronously on most browsers.
    this.synth.onvoiceschanged = () => this.pickVoice();
  }

  /** Choose the most natural-sounding English voice available. */
  private pickVoice(): void {
    if (!this.synth) return;
    const english = this.synth.getVoices().filter((v) => v.lang?.toLowerCase().startsWith('en'));
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
      if (/(compact|eloquence|robot)/.test(tag)) s -= 60;                // demote the robotic ones
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
    if (match) this.voice = match;
  }

  currentVoiceName(): string {
    return this.voice?.name ?? '';
  }

  /** Begin reading the given ordered segments from the top. */
  start(segments: SpeechSegment[]): void {
    if (!this.synth || !segments.length) return;
    this.synth.cancel();
    this.segments = segments;
    this.cursor = 0;
    this.state.set('playing');
    this.speakCurrent();
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
    if (this.voice) utterance.voice = this.voice;
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
    this.synth?.cancel();
  }

  /** Change playback speed; applies from the next sentence. */
  setRate(rate: number): void {
    this.rate.set(Math.min(2, Math.max(0.6, rate)));
  }
}
