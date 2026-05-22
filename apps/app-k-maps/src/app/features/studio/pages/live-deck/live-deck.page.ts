import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, inject, OnDestroy,
  OnInit, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, IonicModule, ToastController } from '@ionic/angular';
import { environment } from '../../../../../environments/environment';
import { StudioApiService } from '../../services/studio-api.service';
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
  selector: 'app-live-deck',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="leave()" fill="clear" aria-label="Leave session">
            <ion-icon slot="icon-only" name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>{{ episodeTitle() || 'Live session' }}</ion-title>
        <ion-buttons slot="end">
          <ion-chip outline class="km-ld-viewers">
            <ion-icon name="people-outline"></ion-icon>
            <ion-label>{{ viewers() }}</ion-label>
          </ion-chip>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="km-ld-content">
      @if (loading()) {
        <div class="km-ld-center">
          <ion-spinner name="dots"></ion-spinner>
          <p>Joining session…</p>
        </div>
      } @else if (error()) {
        <div class="km-ld-center">
          <ion-icon name="alert-circle-outline" class="km-ld-bigicon"></ion-icon>
          <p>{{ error() }}</p>
          <ion-button fill="outline" size="small" (click)="leave()">Back to Studio</ion-button>
        </div>
      } @else if (ended()) {
        <div class="km-ld-center">
          <ion-icon name="checkmark-circle-outline" class="km-ld-bigicon"></ion-icon>
          <p>This session has ended.</p>
          @if (sessionId()) {
            <ion-button size="small" (click)="viewRecap()">View recap</ion-button>
          }
          <ion-button fill="outline" size="small" (click)="leave()">Back to Studio</ion-button>
        </div>
      } @else {
        <div class="km-ld-stage">
          @if (inLobby()) {
            <div class="km-ld-lobby">
              <div class="km-ld-roomcode">{{ code }}</div>
              <button class="km-ld-copy" (click)="copyCode()">
                <ion-icon name="copy-outline"></ion-icon>
                Copy code to share
              </button>
              <h1>{{ episodeTitle() }}</h1>
              <p>{{ isHost()
                ? 'Tap Start when everyone has joined.'
                : 'Waiting for the host to start…' }}</p>
              @if (!connected()) { <p class="km-ld-recon">Reconnecting…</p> }
            </div>
          } @else {
            @if (currentSection(); as section) {
              <div class="km-ld-sectionlabel">{{ section.heading }}</div>
            }
            @if (currentSpeaker(); as speaker) {
              <div class="km-ld-speaker"
                   [style.borderColor]="speaker.color"
                   [style.color]="speaker.color">
                <ion-icon name="mic"></ion-icon> {{ speaker.display_name }}
              </div>
            }
            @if (currentPoint(); as point) {
              <p class="km-ld-point">{{ point.text || '…' }}</p>
            } @else {
              <p class="km-ld-point km-ld-point--empty">Section break</p>
            }
            @if (paused()) { <div class="km-ld-paused">Paused</div> }
          }
        </div>

        @if (!inLobby()) {
          <div class="km-ld-progress">
            <div class="km-ld-progress-bar">
              <span [style.width.%]="progressPct()"></span>
            </div>
            <div class="km-ld-progress-text">
              {{ position().index + 1 }} / {{ position().total }}
            </div>
          </div>
        }
      }
    </ion-content>

    @if (showHostControls()) {
      <ion-footer>
        <ion-toolbar class="km-ld-controls">
          @if (inLobby()) {
            <ion-button expand="block" class="km-ld-start"
                        (click)="next()" [disabled]="!connected()">
              Start episode
            </ion-button>
          } @else {
            <div class="km-ld-controlrow">
              <ion-button fill="clear" (click)="prev()" [disabled]="atStart() || !connected()">
                <ion-icon slot="icon-only" name="play-skip-back-outline"></ion-icon>
              </ion-button>
              <ion-button fill="clear" (click)="togglePause()" [disabled]="!connected()">
                <ion-icon slot="icon-only"
                          [name]="paused() ? 'play-outline' : 'pause-outline'"></ion-icon>
              </ion-button>
              <ion-button fill="clear" (click)="next()" [disabled]="atEnd() || !connected()">
                <ion-icon slot="icon-only" name="play-skip-forward-outline"></ion-icon>
              </ion-button>
              <ion-button fill="clear" color="danger" (click)="endSession()">
                <ion-icon slot="icon-only" name="stop-circle-outline"></ion-icon>
              </ion-button>
            </div>
          }
        </ion-toolbar>
      </ion-footer>
    }

    @if (showViewerFooter()) {
      <ion-footer>
        <ion-toolbar class="km-ld-follow">
          <div class="km-ld-followtext">
            {{ connected() ? 'Following the host' : 'Reconnecting…' }}
          </div>
        </ion-toolbar>
      </ion-footer>
    }
  `,
  styles: [`
    :host { display: block; }
    .km-ld-content {
      --background: radial-gradient(130% 75% at 50% 0%, #1e1b13 0%, #100e09 62%);
    }
    .km-ld-viewers { --color: var(--ion-color-medium); height: 26px; }

    .km-ld-center {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 12px; min-height: 70vh; padding: 24px; text-align: center;
      color: var(--ion-color-medium);
    }
    .km-ld-bigicon { font-size: 3.4rem; opacity: 0.5; }

    .km-ld-stage {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 18px; min-height: 74vh; padding: 32px 24px; text-align: center;
    }

    .km-ld-lobby { display: flex; flex-direction: column; align-items: center; gap: 10px; }
    .km-ld-roomcode {
      font-family: 'Courier New', monospace; font-size: 2.6rem; font-weight: 700;
      letter-spacing: 0.32em; color: #c9a84c; padding-left: 0.32em;
      text-shadow: 0 2px 16px rgba(201,168,76,0.5);
    }
    .km-ld-copy {
      display: inline-flex; align-items: center; gap: 6px;
      margin-top: 4px; padding: 8px 16px; border-radius: 18px;
      background: linear-gradient(180deg, rgba(201,168,76,0.24), rgba(201,168,76,0.07));
      border: 1px solid rgba(201,168,76,0.35); color: #e8c96a;
      font-size: 0.8rem; font-weight: 600; cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.1);
    }
    .km-ld-copy ion-icon { font-size: 1rem; }
    .km-ld-lobby h1 { font-size: 1.4rem; font-weight: 600; margin: 6px 0 0; color: #f4ecd8; }
    .km-ld-lobby p { color: var(--ion-color-medium); font-size: 0.92rem; margin: 0; }
    .km-ld-recon { color: #c9a84c !important; font-size: 0.8rem !important; }

    .km-ld-sectionlabel {
      font-size: 0.72rem; font-weight: 700; letter-spacing: 0.16em;
      text-transform: uppercase; color: #c9a84c;
    }
    .km-ld-speaker {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 17px; border: 1.5px solid; border-radius: 20px;
      font-size: 0.86rem; font-weight: 600;
      background: linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.02));
      box-shadow: 0 6px 16px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.09);
    }
    .km-ld-point {
      font-size: 1.7rem; line-height: 1.45; font-weight: 500;
      color: #f4ecd8; max-width: 640px; margin: 0;
    }
    .km-ld-point--empty { color: var(--ion-color-medium); font-style: italic; }
    .km-ld-paused {
      margin-top: 6px; font-size: 0.74rem; font-weight: 700; letter-spacing: 0.12em;
      text-transform: uppercase; color: #e0a32e;
    }

    .km-ld-progress { padding: 8px 24px 24px; }
    .km-ld-progress-bar {
      height: 5px; background: rgba(0,0,0,0.55); border-radius: 3px; overflow: hidden;
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.85);
    }
    .km-ld-progress-bar span {
      display: block; height: 100%;
      background: linear-gradient(180deg, #e8c96a, #c9a84c);
      box-shadow: 0 0 9px rgba(201,168,76,0.6); transition: width 0.25s ease;
    }
    .km-ld-progress-text {
      margin-top: 6px; text-align: center; font-size: 0.72rem; color: var(--ion-color-medium);
    }

    .km-ld-controls { --background: #1c1810; }
    .km-ld-controlrow {
      display: flex; align-items: center; justify-content: space-around; padding: 2px 8px;
    }
    .km-ld-controlrow ion-button { --color: #f4ecd8; font-size: 1.1rem; }
    .km-ld-start {
      margin: 8px 12px; --background: linear-gradient(180deg, #e8c96a, #c9a84c);
      --color: #14110b; font-weight: 700; --box-shadow: 0 7px 18px rgba(0,0,0,0.5);
    }
    .km-ld-follow { --background: #1c1810; }
    .km-ld-followtext {
      text-align: center; padding: 10px; font-size: 0.78rem; color: var(--ion-color-medium);
    }
  `],
})
export class LiveDeckPage implements OnInit, OnDestroy {
  private studio = inject(StudioApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private cdr = inject(ChangeDetectorRef);

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

  showHostControls = computed(() =>
    !this.loading() && !this.error() && !this.ended() && this.isHost());
  showViewerFooter = computed(() =>
    !this.loading() && !this.error() && !this.ended() && !this.isHost());

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
        this.cdr.markForCheck();
      },
    });
  }

  ionViewWillLeave(): void {
    this.teardown();
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
      this.cdr.markForCheck();
    };
    socket.onmessage = (ev: MessageEvent) => this.onMessage(ev);
    socket.onerror = () => { /* an onclose always follows */ };
    socket.onclose = () => {
      this.connected.set(false);
      this.stopPing();
      this.cdr.markForCheck();
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
    this.cdr.markForCheck();
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
    const token = localStorage.getItem('auth_token') ?? '';
    return `${base}/st/sessions/${encodeURIComponent(this.code)}/live`
      + `?token=${encodeURIComponent(token)}`;
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= 5) {
      this.error.set('Lost connection to the session.');
      this.cdr.markForCheck();
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
      socket.onclose = null;   // prevent the reconnect handler from firing
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

  private send(t: string, extra: Record<string, unknown> = {}): void {
    try { this.ws?.send(JSON.stringify({ t, ...extra })); } catch { /* socket gone */ }
  }

  next(): void { this.send('next'); }
  prev(): void { this.send('prev'); }
  togglePause(): void { this.send(this.paused() ? 'resume' : 'pause'); }

  async endSession(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'End session?',
      message: 'Every connected screen will be returned to Studio.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'End', role: 'destructive', handler: () => this.send('end') },
      ],
    });
    await alert.present();
  }

  leave(): void {
    this.teardown();
    this.router.navigate(['/studio']);
  }

  /** Copy the room code so the host can paste it into any chat to invite people. */
  async copyCode(): Promise<void> {
    try {
      await navigator.clipboard?.writeText(this.code);
    } catch {
      // Clipboard blocked (insecure context / permissions) — still confirm below.
    }
    const toast = await this.toastCtrl.create({
      message: `Room code ${this.code} copied — share it to invite people.`,
      duration: 1800,
      position: 'bottom',
    });
    await toast.present();
  }

  viewRecap(): void {
    const id = this.sessionId();
    this.teardown();
    this.router.navigate(id ? ['/studio/recap', id] : ['/studio']);
  }
}
