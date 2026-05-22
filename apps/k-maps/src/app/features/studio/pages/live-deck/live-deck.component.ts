import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { StudioApiService } from '../../studio-api.service';
import { EpisodeAggregate, LiveCursor } from '../../studio.models';

const LOBBY: LiveCursor = { section: -1, point: -1 };

/** A message broadcast by the EpisodeSession Durable Object. */
interface LiveMessage {
  t: string;
  role?: 'host' | 'viewer';
  episode?: EpisodeAggregate;
  cursor?: LiveCursor;
  paused?: boolean;
  viewers?: number;
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
      } @else {
        <div class="deck-stage">
          @if (inLobby()) {
            <div class="deck-lobby">
              <div class="deck-roomcode">{{ code }}</div>
              <h1>{{ episodeTitle() }}</h1>
              <p>{{ isHost()
                ? 'Press Start when everyone has joined.'
                : 'Waiting for the host to start…' }}</p>
              @if (!connected()) { <p class="deck-recon">Reconnecting…</p> }
            </div>
          } @else {
            @if (currentSection(); as section) {
              <div class="deck-sectionlabel">{{ section.heading }}</div>
            }
            @if (currentSpeaker(); as speaker) {
              <div class="deck-speaker"
                   [style.borderColor]="speaker.color" [style.color]="speaker.color">
                🎙 {{ speaker.display_name }}
              </div>
            }
            @if (currentPoint(); as point) {
              <p class="deck-point">{{ point.text || '…' }}</p>
            } @else {
              <p class="deck-point deck-point--empty">Section break</p>
            }
            @if (paused()) { <div class="deck-paused">Paused</div> }
          }
        </div>

        @if (!inLobby()) {
          <div class="deck-progress">
            <div class="deck-progress-bar"><span [style.width.%]="progressPct()"></span></div>
            <div class="deck-progress-text">
              {{ position().index + 1 }} / {{ position().total }}
            </div>
          </div>
        }

        @if (isHost()) {
          <div class="deck-foot">
            @if (inLobby()) {
              <button type="button" class="deck-btn deck-btn--gold deck-start"
                      (click)="next()" [disabled]="!connected()">
                Start episode
              </button>
            } @else {
              <div class="deck-controls">
                <button type="button" class="deck-ctl" (click)="prev()"
                        [disabled]="atStart() || !connected()">⏮</button>
                <button type="button" class="deck-ctl" (click)="togglePause()"
                        [disabled]="!connected()">{{ paused() ? '▶' : '⏸' }}</button>
                <button type="button" class="deck-ctl" (click)="next()"
                        [disabled]="atEnd() || !connected()">⏭</button>
                <button type="button" class="deck-ctl deck-ctl--end" (click)="endSession()">⏹</button>
              </div>
            }
          </div>
        } @else {
          <div class="deck-foot deck-foot--viewer">
            {{ connected() ? 'Following the host' : 'Reconnecting…' }}
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

    .deck-sectionlabel {
      font-size: 0.74rem; font-weight: 700; letter-spacing: 0.16em;
      text-transform: uppercase; color: var(--km-gold, #c9a84c);
    }
    .deck-speaker {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 19px; border: 1.5px solid; border-radius: 22px;
      font-size: 0.9rem; font-weight: 600;
      background: linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.02));
      box-shadow: 0 6px 16px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.09);
    }
    .deck-point {
      font-size: 2rem; line-height: 1.45; font-weight: 500; max-width: 760px; margin: 0;
    }
    .deck-point--empty { color: rgba(255,255,255,0.4); font-style: italic; }
    .deck-paused {
      font-size: 0.78rem; font-weight: 700; letter-spacing: 0.12em;
      text-transform: uppercase; color: #e0a32e;
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

  private ws: WebSocket | null = null;
  private leaving = false;
  private reconnectAttempts = 0;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Derived state ────────────────────────────────────────────────────────────

  isHost = computed(() => this.role() === 'host');
  inLobby = computed(() => this.cursor().section < 0);

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
        this.loading.set(false);
        break;
      case 'cursor':
        if (msg.cursor) this.cursor.set(msg.cursor);
        if (typeof msg.paused === 'boolean') this.paused.set(msg.paused);
        break;
      case 'presence':
        if (typeof msg.viewers === 'number') this.viewers.set(msg.viewers);
        break;
      case 'ended':
        this.ended.set(true);
        this.loading.set(false);
        this.closeSocket();
        break;
    }
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
