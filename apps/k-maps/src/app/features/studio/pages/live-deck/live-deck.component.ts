import {
  Component, computed, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { StudioApiService } from '../../studio-api.service';
import { EpisodeAggregate, LiveCursor, RosterEntry } from '../../studio.models';

const LOBBY: LiveCursor = { section: -1, point: -1 };

/** A message broadcast by the EpisodeSession Durable Object. */
interface LiveMessage {
  t: string;
  role?: 'host' | 'viewer';
  episode?: EpisodeAggregate;
  cursor?: LiveCursor;
  paused?: boolean;
  viewers?: number;
  roster?: RosterEntry[];
  you?: RosterEntry;
}

/** One card in the live deck — a flattened talking point. */
interface DeckCard {
  index: number;
  section: string;
  text: string;
  bridge: string | null;
  speakerName: string | null;
  speakerColor: string | null;
  speakerRef: string | null;
}

@Component({
  selector: 'km-studio-live-deck',
  standalone: true,
  imports: [],
  template: `
    <div class="deck">
      <div class="deck-top">
        <button type="button" class="deck-x" (click)="leave()" aria-label="Leave">✕</button>
        <div class="deck-title">{{ episodeTitle() || 'Live session' }}</div>
        <div class="deck-viewers">👁 {{ viewers() }}</div>
      </div>

      @if (loading()) {
        <div class="deck-center">Joining session…</div>
      } @else if (error()) {
        <div class="deck-center">
          <div class="deck-bigicon">⚠</div>
          <p>{{ error() }}</p>
          <button type="button" class="deck-btn" (click)="leave()">Back to Studio</button>
        </div>
      } @else if (ended()) {
        <div class="deck-center">
          <div class="deck-bigicon">✓</div>
          <p>This session has ended.</p>
          <div class="deck-center-actions">
            @if (sessionId()) {
              <button type="button" class="deck-btn deck-btn--gold" (click)="viewRecap()">
                View recap
              </button>
            }
            <button type="button" class="deck-btn" (click)="leave()">Back to Studio</button>
          </div>
        </div>
      } @else if (inLobby()) {
        <div class="deck-stage">
          <div class="deck-lobby">
            <div class="deck-roomcode">{{ code }}</div>
            <h1>{{ episodeTitle() }}</h1>
            <p>{{ isHost()
              ? 'Press Start when everyone has joined.'
              : 'Waiting for the host to start…' }}</p>

            @if (namedRoster().length) {
              <div class="deck-roster">
                @for (r of namedRoster(); track $index) {
                  <span class="deck-rosterchip" [style.borderColor]="r.color || '#c9a84c'">
                    <span class="deck-rosterdot"
                          [style.background]="r.color || '#c9a84c'"></span>
                    {{ r.name }}
                    @if (r.role === 'host') { <span class="deck-rosterrole">host</span> }
                  </span>
                }
              </div>
            }
            @if (guestCount() > 0) {
              <p class="deck-guests">
                + {{ guestCount() }} {{ guestCount() === 1 ? 'guest' : 'guests' }} watching
              </p>
            }
            @if (you(); as me) {
              <p class="deck-youare">
                {{ me.name ? "You're in as " + me.name : "You're watching as a guest" }}
              </p>
            }
            @if (!connected()) { <p class="deck-recon">Reconnecting…</p> }
          </div>
        </div>

        @if (isHost()) {
          <div class="deck-foot">
            <button type="button" class="deck-btn deck-btn--gold deck-start"
                    (click)="next()" [disabled]="!connected()">
              Start episode
            </button>
          </div>
        } @else {
          <div class="deck-foot deck-foot--viewer">
            {{ connected() ? 'Waiting for the host to start…' : 'Reconnecting…' }}
          </div>
        }
      } @else {
        <div class="deck-strip" #strip>
          @for (card of cards(); track card.index) {
            <div class="deck-card"
                 [class.deck-card--live]="card.index === activeIndex()"
                 [class.deck-card--done]="card.index < activeIndex()">
              <div class="deck-card-top">
                <span class="deck-card-sec">{{ card.section }}</span>
                @if (card.index === activeIndex()) {
                  <span class="deck-card-flag">● Live</span>
                } @else if (card.index < activeIndex()) {
                  <span class="deck-card-tick">✓</span>
                }
              </div>
              @if (card.speakerName) {
                <div class="deck-card-speaker"
                     [style.color]="card.speakerColor || '#c9a84c'"
                     [style.borderColor]="card.speakerColor || '#c9a84c'">
                  🎙 {{ card.speakerName }}
                </div>
              }
              <p class="deck-card-text">{{ card.text || 'Section break' }}</p>
              @if (card.bridge) {
                <div class="deck-card-bridge">↪ {{ card.bridge }}</div>
              }
            </div>
          }
        </div>
        @if (paused()) { <div class="deck-pausedbar">Paused</div> }
        <div class="deck-progress">
          <div class="deck-progress-bar"><span [style.width.%]="progressPct()"></span></div>
          <div class="deck-progress-text">
            {{ position().index + 1 }} / {{ position().total }}
          </div>
        </div>

        @if (isHost()) {
          <div class="deck-foot">
            <div class="deck-controls">
              <button type="button" class="deck-ctl" (click)="prev()"
                      [disabled]="atStart() || !connected()">⏮</button>
              <button type="button" class="deck-ctl" (click)="togglePause()"
                      [disabled]="!connected()">{{ paused() ? '▶' : '⏸' }}</button>
              <button type="button" class="deck-ctl" (click)="next()"
                      [disabled]="atEnd() || !connected()">⏭</button>
              <button type="button" class="deck-ctl deck-ctl--end" (click)="endSession()">⏹</button>
            </div>
          </div>
        } @else {
          <div class="deck-foot deck-foot--viewer">
            @if (!connected()) {
              Reconnecting…
            } @else if (isMyTurn()) {
              <button type="button" class="deck-btn deck-btn--gold deck-myturn"
                      (click)="next()" [disabled]="atEnd()">
                {{ atEnd() ? "You're done ✓" : "Done — next ▸" }}
              </button>
            } @else if (currentSpeaker(); as speaker) {
              <span class="deck-turndot" [style.background]="speaker.color"></span>
              {{ speaker.display_name }} is speaking…
            } @else {
              Following the host
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .deck {
      display: flex; flex-direction: column; height: 100dvh;
      background: radial-gradient(130% 75% at 50% 0%, #1e1b13 0%, #100e09 62%);
      color: #f4ecd8; font-family: var(--km-font-body, system-ui, sans-serif);
    }
    .deck-top {
      display: flex; align-items: center; gap: 12px; padding: 12px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    .deck-x {
      background: transparent; border: none; color: rgba(255,255,255,0.6);
      font-size: 1.1rem; cursor: pointer;
    }
    .deck-title { flex: 1; font-size: 0.92rem; font-weight: 600; }
    .deck-viewers { font-size: 0.8rem; color: rgba(255,255,255,0.55); }

    .deck-center {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 12px; text-align: center; padding: 24px;
      color: rgba(255,255,255,0.65);
    }
    .deck-bigicon { font-size: 2.6rem; opacity: 0.6; }
    .deck-center-actions { display: flex; gap: 10px; }

    .deck-stage {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 18px; padding: 40px 28px; text-align: center;
    }
    .deck-lobby { display: flex; flex-direction: column; align-items: center; gap: 10px; }
    .deck-roomcode {
      font-family: 'Courier New', monospace; font-size: 3rem; font-weight: 700;
      letter-spacing: 0.34em; color: var(--km-gold, #c9a84c); padding-left: 0.34em;
      text-shadow: 0 2px 18px rgba(201,168,76,0.5);
    }
    .deck-lobby h1 { margin: 6px 0 0; font-size: 1.5rem; }
    .deck-lobby p { margin: 0; color: rgba(255,255,255,0.5); }
    .deck-recon { color: var(--km-gold, #c9a84c) !important; font-size: 0.82rem; }

    .deck-roster {
      display: flex; flex-wrap: wrap; justify-content: center; gap: 8px;
      margin-top: 4px; max-width: 420px;
    }
    .deck-rosterchip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 13px; border-radius: 16px;
      border: 1px solid rgba(201,168,76,0.4);
      background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
      box-shadow: 0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07);
      font-size: 0.85rem; font-weight: 600; color: #f4ecd8;
    }
    .deck-rosterdot {
      width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
      box-shadow: 0 0 6px rgba(255,255,255,0.3);
    }
    .deck-rosterrole {
      font-size: 0.64rem; font-weight: 700; letter-spacing: 0.08em;
      text-transform: uppercase; color: var(--km-gold, #c9a84c);
    }
    .deck-guests { font-size: 0.8rem; color: rgba(255,255,255,0.5); margin: 0; }
    .deck-youare {
      font-size: 0.82rem; color: var(--km-gold, #c9a84c); margin: 0; font-weight: 600;
    }

    .deck-strip {
      flex: 1; display: flex; gap: 16px; overflow-x: auto;
      scroll-snap-type: x mandatory; padding: 24px 9vw; align-items: stretch;
    }
    .deck-strip::-webkit-scrollbar { height: 0; }
    .deck-card {
      flex: 0 0 86%; max-width: 680px; scroll-snap-align: center;
      display: flex; flex-direction: column; gap: 14px;
      padding: 26px 24px; border-radius: 18px;
      background: linear-gradient(180deg, #232017 0%, #131210 100%);
      border: 1px solid rgba(255,255,255,0.05);
      box-shadow: 0 16px 34px rgba(0,0,0,0.62), inset 0 1px 0 rgba(255,255,255,0.05);
      opacity: 0.42; transition: opacity 0.25s ease, border-color 0.25s ease;
    }
    .deck-card--done { opacity: 0.32; }
    .deck-card--live {
      opacity: 1; border-color: rgba(201,168,76,0.55);
      box-shadow: 0 18px 40px rgba(0,0,0,0.68), 0 0 24px rgba(201,168,76,0.16),
                  inset 0 1px 0 rgba(255,255,255,0.07);
    }
    .deck-card-top { display: flex; align-items: center; justify-content: space-between; }
    .deck-card-sec {
      font-size: 0.7rem; font-weight: 700; letter-spacing: 0.15em;
      text-transform: uppercase; color: var(--km-gold, #c9a84c);
    }
    .deck-card-flag {
      font-size: 0.62rem; font-weight: 700; letter-spacing: 0.1em;
      text-transform: uppercase; color: #e8c96a;
    }
    .deck-card-tick { font-size: 0.9rem; color: #5cc94c; }
    .deck-card-speaker {
      align-self: flex-start; display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 16px; border: 1.5px solid; border-radius: 20px;
      font-size: 0.86rem; font-weight: 600;
      background: linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.02));
    }
    .deck-card-text {
      flex: 1; font-size: 1.7rem; line-height: 1.45; font-weight: 500; margin: 0;
    }
    .deck-card-bridge {
      font-size: 1rem; line-height: 1.45; color: #e8c96a;
      padding-top: 14px; border-top: 1px dashed rgba(201,168,76,0.3);
    }
    .deck-pausedbar {
      text-align: center; font-size: 0.76rem; font-weight: 700;
      letter-spacing: 0.12em; text-transform: uppercase; color: #e0a32e; padding: 4px 0;
    }

    .deck-progress { padding: 8px 28px; }
    .deck-progress-bar {
      height: 5px; background: rgba(0,0,0,0.55); border-radius: 3px; overflow: hidden;
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.85);
    }
    .deck-progress-bar span {
      display: block; height: 100%;
      background: linear-gradient(180deg, #e8c96a, #c9a84c);
      box-shadow: 0 0 9px rgba(201,168,76,0.6); transition: width 0.25s ease;
    }
    .deck-progress-text {
      margin-top: 6px; text-align: center; font-size: 0.74rem; color: rgba(255,255,255,0.45);
    }

    .deck-foot {
      padding: 14px 20px 22px; border-top: 1px solid rgba(255,255,255,0.07);
    }
    .deck-foot--viewer { text-align: center; font-size: 0.8rem; color: rgba(255,255,255,0.45); }
    .deck-controls { display: flex; align-items: center; justify-content: center; gap: 26px; }
    .deck-ctl {
      width: 52px; height: 52px; border-radius: 50%; cursor: pointer;
      display: flex; align-items: center; justify-content: center; font-size: 1.4rem;
      color: #f4ecd8;
      background: linear-gradient(180deg, #2a261c 0%, #15130e 100%);
      border: 1px solid rgba(255,255,255,0.06);
      box-shadow: 0 6px 14px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07);
    }
    .deck-ctl:disabled { opacity: 0.3; cursor: default; box-shadow: none; }
    .deck-ctl--end { color: #e0584e; }

    .deck-btn {
      padding: 9px 16px; border-radius: 9px; font-size: 0.85rem; cursor: pointer;
      background: rgba(255,255,255,0.08); color: #f4ecd8; border: 1px solid rgba(255,255,255,0.14);
    }
    .deck-btn--gold {
      background: linear-gradient(180deg, #e8c96a, #c9a84c); color: #14110b; font-weight: 700;
      border-color: var(--km-gold, #c9a84c);
      box-shadow: 0 6px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.25);
    }
    .deck-start { display: block; width: 100%; max-width: 320px; margin: 0 auto; padding: 12px; }
    .deck-start:disabled { opacity: 0.5; cursor: default; }
    .deck-myturn { padding: 11px 28px; font-size: 0.95rem; }
    .deck-myturn:disabled { opacity: 0.5; cursor: default; }
    .deck-turndot {
      display: inline-block; width: 9px; height: 9px; border-radius: 50%;
      margin-right: 7px; vertical-align: middle;
    }
  `],
})
export class LiveDeckComponent implements OnInit, OnDestroy {
  private studio = inject(StudioApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  code = '';

  loading = signal(true);
  error = signal<string | null>(null);
  ended = signal(false);
  connected = signal(false);
  role = signal<'host' | 'viewer'>('viewer');
  episodeTitle = signal('');
  sessionId = signal('');
  episode = signal<EpisodeAggregate | null>(null);
  cursor = signal<LiveCursor>(LOBBY);
  paused = signal(false);
  viewers = signal(1);
  roster = signal<RosterEntry[]>([]);
  you = signal<RosterEntry | null>(null);

  private ws: WebSocket | null = null;
  private leaving = false;
  private reconnectAttempts = 0;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  @ViewChild('strip') private strip?: ElementRef<HTMLElement>;

  // ── Derived state ────────────────────────────────────────────────────────────

  isHost = computed(() => this.role() === 'host');
  inLobby = computed(() => this.cursor().section < 0);

  /** Identified cast members currently connected (named entries only). */
  namedRoster = computed(() => this.roster().filter((r) => !!r.name));
  /** Connected screens that did not resolve to a cast member. */
  guestCount = computed(() => this.roster().filter((r) => !r.name).length);

  currentSection = computed(() => {
    const ep = this.episode();
    const c = this.cursor();
    return ep && c.section >= 0 ? ep.sections[c.section] ?? null : null;
  });

  currentPoint = computed(() => {
    const section = this.currentSection();
    const c = this.cursor();
    return section && c.point >= 0 ? section.points[c.point] ?? null : null;
  });

  currentSpeaker = computed(() => {
    const point = this.currentPoint();
    const ep = this.episode();
    if (!point || !point.speaker_ref || !ep) return null;
    return ep.participants.find((p) => p.id === point.speaker_ref) ?? null;
  });

  stops = computed<LiveCursor[]>(() => {
    const ep = this.episode();
    if (!ep) return [];
    const out: LiveCursor[] = [];
    ep.sections.forEach((section, s) => {
      if (section.points.length === 0) out.push({ section: s, point: -1 });
      else section.points.forEach((_, p) => out.push({ section: s, point: p }));
    });
    return out;
  });

  position = computed(() => {
    const stops = this.stops();
    const c = this.cursor();
    const index = stops.findIndex((x) => x.section === c.section && x.point === c.point);
    return { index, total: stops.length };
  });

  progressPct = computed(() => {
    const { index, total } = this.position();
    return total > 0 && index >= 0 ? Math.round(((index + 1) / total) * 100) : 0;
  });

  atStart = computed(() => this.position().index <= 0);
  atEnd = computed(() => {
    const { index, total } = this.position();
    return index >= 0 && index >= total - 1;
  });

  /** Every talking point flattened to an ordered card, for the deck carousel. */
  cards = computed<DeckCard[]>(() => {
    const ep = this.episode();
    if (!ep) return [];
    const out: DeckCard[] = [];
    let i = 0;
    for (const section of ep.sections) {
      if (section.points.length === 0) {
        out.push({
          index: i++, section: section.heading, text: '', bridge: null,
          speakerName: null, speakerColor: null, speakerRef: null,
        });
      } else {
        for (const point of section.points) {
          const speaker = point.speaker_ref
            ? ep.participants.find((p) => p.id === point.speaker_ref) ?? null
            : null;
          out.push({
            index: i++, section: section.heading, text: point.text,
            bridge: point.bridge, speakerName: speaker?.display_name ?? null,
            speakerColor: speaker?.color ?? null, speakerRef: point.speaker_ref,
          });
        }
      }
    }
    return out;
  });

  activeIndex = computed(() => this.position().index);

  /** True when the current card is assigned to this viewer — their turn to push. */
  isMyTurn = computed(() => {
    const me = this.you();
    const card = this.cards()[this.activeIndex()];
    return !!me?.participantId && !!card && card.speakerRef === me.participantId;
  });

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.code = (this.route.snapshot.paramMap.get('code') ?? '').toUpperCase();
    if (!this.code) {
      this.error.set('No session code was provided.');
      this.loading.set(false);
      return;
    }
    this.studio.getSession(this.code).subscribe({
      next: (info) => {
        this.episodeTitle.set(info.episode_title ?? 'Episode');
        this.sessionId.set(info.session_id);
        this.role.set(info.host ? 'host' : 'viewer');
        this.connect();
      },
      error: () => {
        this.error.set('That session could not be found — it may have ended.');
        this.loading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    this.teardown();
  }

  // ── WebSocket ────────────────────────────────────────────────────────────────

  private connect(): void {
    let socket: WebSocket;
    try {
      socket = new WebSocket(this.buildWsUrl());
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = socket;

    socket.onopen = () => {
      this.connected.set(true);
      this.reconnectAttempts = 0;
      this.startPing();
    };
    socket.onmessage = (ev: MessageEvent) => this.onMessage(ev);
    socket.onerror = () => { /* an onclose always follows */ };
    socket.onclose = () => {
      this.connected.set(false);
      this.stopPing();
      if (!this.leaving && !this.ended()) this.scheduleReconnect();
    };
  }

  private onMessage(ev: MessageEvent): void {
    const raw = typeof ev.data === 'string' ? ev.data : '';
    if (!raw || raw === 'pong') return;

    let msg: LiveMessage;
    try {
      msg = JSON.parse(raw) as LiveMessage;
    } catch {
      return;
    }

    switch (msg.t) {
      case 'sync':
        if (msg.episode) this.episode.set(msg.episode);
        if (msg.cursor) this.cursor.set(msg.cursor);
        if (typeof msg.paused === 'boolean') this.paused.set(msg.paused);
        if (typeof msg.viewers === 'number') this.viewers.set(msg.viewers);
        if (msg.role) this.role.set(msg.role);
        if (msg.roster) this.roster.set(msg.roster);
        if (msg.you) this.you.set(msg.you);
        this.loading.set(false);
        break;
      case 'cursor':
        if (msg.cursor) this.cursor.set(msg.cursor);
        if (typeof msg.paused === 'boolean') this.paused.set(msg.paused);
        break;
      case 'presence':
        if (typeof msg.viewers === 'number') this.viewers.set(msg.viewers);
        if (msg.roster) this.roster.set(msg.roster);
        break;
      case 'ended':
        this.ended.set(true);
        this.loading.set(false);
        this.closeSocket();
        break;
    }
    if (msg.t === 'sync' || msg.t === 'cursor') {
      setTimeout(() => this.scrollToActive(), 90);
    }
  }

  /** Centre the live card in the carousel when the synced cursor moves. */
  private scrollToActive(): void {
    const el = this.strip?.nativeElement;
    if (!el) return;
    const card = el.children[this.activeIndex()] as HTMLElement | undefined;
    card?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }

  private buildWsUrl(): string {
    const api = environment.apiBase;
    let base: string;
    if (api.startsWith('https://')) {
      base = 'wss://' + api.slice('https://'.length);
    } else if (api.startsWith('http://')) {
      base = 'ws://' + api.slice('http://'.length);
    } else {
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      base = `${proto}//${location.host}${api}`;
    }
    const token = localStorage.getItem('km_token') ?? '';
    return `${base}/st/sessions/${encodeURIComponent(this.code)}/live`
      + `?token=${encodeURIComponent(token)}`;
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= 5) {
      this.error.set('Lost connection to the session.');
      return;
    }
    const delay = Math.min(8000, 1000 * 2 ** this.reconnectAttempts);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      try { this.ws?.send('ping'); } catch { /* socket gone */ }
    }, 25000);
  }

  private stopPing(): void {
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
  }

  private closeSocket(): void {
    this.stopPing();
    const socket = this.ws;
    this.ws = null;
    if (socket) {
      socket.onclose = null;
      socket.onmessage = null;
      try { socket.close(); } catch { /* already closed */ }
    }
  }

  private teardown(): void {
    this.leaving = true;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.closeSocket();
  }

  // ── Host actions ─────────────────────────────────────────────────────────────

  private send(t: string): void {
    try { this.ws?.send(JSON.stringify({ t })); } catch { /* socket gone */ }
  }

  next(): void { this.send('next'); }
  prev(): void { this.send('prev'); }
  togglePause(): void { this.send(this.paused() ? 'resume' : 'pause'); }

  endSession(): void {
    if (window.confirm('End the session? Every connected screen returns to Studio.')) {
      this.send('end');
    }
  }

  leave(): void {
    this.teardown();
    this.router.navigate(['/studio']);
  }

  viewRecap(): void {
    const id = this.sessionId();
    this.teardown();
    this.router.navigate(id ? ['/studio/recap', id] : ['/studio']);
  }
}
