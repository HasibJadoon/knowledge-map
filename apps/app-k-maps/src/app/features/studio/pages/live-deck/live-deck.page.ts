import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, ElementRef, inject,
  OnDestroy, OnInit, QueryList, signal, ViewChildren,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, IonicModule, ToastController } from '@ionic/angular';
import gsap from 'gsap';
import { environment } from '../../../../../environments/environment';
import { StudioApiService } from '../../services/studio-api.service';
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
      } @else if (inLobby()) {
        <div class="km-ld-stage">
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

            @if (namedRoster().length) {
              <div class="km-ld-roster">
                @for (r of namedRoster(); track $index) {
                  <span class="km-ld-rosterchip" [style.borderColor]="r.color || '#c9a84c'">
                    <span class="km-ld-rosterdot"
                          [style.background]="r.color || '#c9a84c'"></span>
                    {{ r.name }}
                    @if (r.role === 'host') { <span class="km-ld-rosterrole">host</span> }
                  </span>
                }
              </div>
            }
            @if (guestCount() > 0) {
              <p class="km-ld-guests">
                + {{ guestCount() }} {{ guestCount() === 1 ? 'guest' : 'guests' }} watching
              </p>
            }
            @if (you(); as me) {
              <p class="km-ld-youare">
                {{ me.name ? "You're in as " + me.name : "You're watching as a guest" }}
              </p>
            }
            @if (!connected()) { <p class="km-ld-recon">Reconnecting…</p> }
          </div>
        </div>
      } @else {
        <div class="km-ld-hand">
          @for (card of cards(); track card.index) {
            <div class="km-ld-card" #cardEl
                 [class.km-ld-card--live]="card.index === activeIndex()"
                 [class.km-ld-card--done]="card.index < activeIndex()">
              <div class="km-ld-card-top">
                <span class="km-ld-card-sec">{{ card.section }}</span>
                @if (card.index === activeIndex()) {
                  <span class="km-ld-card-flag">● Live</span>
                } @else if (card.index < activeIndex()) {
                  <span class="km-ld-card-tick">✓</span>
                }
              </div>
              @if (card.speakerName) {
                <div class="km-ld-card-speaker"
                     [style.color]="card.speakerColor || '#c9a84c'"
                     [style.borderColor]="card.speakerColor || '#c9a84c'">
                  <ion-icon name="mic"></ion-icon> {{ card.speakerName }}
                </div>
              }
              <p class="km-ld-card-text">{{ card.text || 'Section break' }}</p>
              @if (card.bridge) {
                <div class="km-ld-card-bridge">↪ {{ card.bridge }}</div>
              }
            </div>
          }
        </div>
        @if (paused()) { <div class="km-ld-pausedbar">Paused</div> }
        <div class="km-ld-progress">
          <div class="km-ld-progress-bar">
            <span [style.width.%]="progressPct()"></span>
          </div>
          <div class="km-ld-progress-text">
            {{ position().index + 1 }} / {{ position().total }}
          </div>
        </div>
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
          @if (!connected()) {
            <div class="km-ld-followtext">Reconnecting…</div>
          } @else if (inLobby()) {
            <div class="km-ld-followtext">Waiting for the host to start…</div>
          } @else if (isMyTurn()) {
            <ion-button expand="block" class="km-ld-myturn"
                        (click)="next()" [disabled]="atEnd()">
              {{ atEnd() ? "You're done ✓" : "Done — next ▸" }}
            </ion-button>
          } @else if (currentSpeaker(); as speaker) {
            <div class="km-ld-followtext">
              <span class="km-ld-turndot" [style.background]="speaker.color"></span>
              {{ speaker.display_name }} is speaking…
            </div>
          } @else {
            <div class="km-ld-followtext">Following the host</div>
          }
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

    .km-ld-roster {
      display: flex; flex-wrap: wrap; justify-content: center; gap: 8px;
      margin-top: 6px; max-width: 340px;
    }
    .km-ld-rosterchip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 12px; border-radius: 16px;
      border: 1px solid rgba(201,168,76,0.4);
      background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
      box-shadow: 0 4px 11px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07);
      font-size: 0.82rem; font-weight: 600; color: #f4ecd8;
    }
    .km-ld-rosterdot {
      width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
      box-shadow: 0 0 6px rgba(255,255,255,0.3);
    }
    .km-ld-rosterrole {
      font-size: 0.62rem; font-weight: 700; letter-spacing: 0.08em;
      text-transform: uppercase; color: #c9a84c;
    }
    .km-ld-guests { font-size: 0.78rem; color: var(--ion-color-medium); margin: 2px 0 0; }
    .km-ld-youare { font-size: 0.8rem; color: #c9a84c; margin: 4px 0 0; font-weight: 600; }

    .km-ld-hand {
      position: relative; width: 100%; height: 58vh;
      perspective: 1500px; transform-style: preserve-3d;
      margin: 14px 0 4px;
    }
    .km-ld-card {
      position: absolute; left: 50%; top: 50%;
      width: 80%; max-width: 340px; height: 88%; max-height: 460px;
      margin-left: -40%; margin-top: -44%;
      transform-origin: 50% 115%;
      display: flex; flex-direction: column; gap: 12px;
      padding: 20px 18px; border-radius: 16px;
      background: linear-gradient(180deg, #232017 0%, #131210 100%);
      border: 1px solid rgba(255,255,255,0.06);
      box-shadow: 0 14px 30px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05);
      backface-visibility: hidden; will-change: transform, opacity;
    }
    .km-ld-card--live {
      border-color: rgba(201,168,76,0.55);
      box-shadow: 0 18px 40px rgba(0,0,0,0.7), 0 0 26px rgba(201,168,76,0.18),
                  inset 0 1px 0 rgba(255,255,255,0.07);
    }
    .km-ld-card-top { display: flex; align-items: center; justify-content: space-between; }
    .km-ld-card-sec {
      font-size: 0.66rem; font-weight: 700; letter-spacing: 0.14em;
      text-transform: uppercase; color: #c9a84c;
    }
    .km-ld-card-flag {
      font-size: 0.6rem; font-weight: 700; letter-spacing: 0.1em;
      text-transform: uppercase; color: #e8c96a;
    }
    .km-ld-card-tick { font-size: 0.82rem; color: #5cc94c; }
    .km-ld-card-speaker {
      align-self: flex-start; display: inline-flex; align-items: center; gap: 5px;
      padding: 5px 13px; border: 1.5px solid; border-radius: 16px;
      font-size: 0.8rem; font-weight: 600;
      background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
    }
    .km-ld-card-text {
      flex: 1; font-size: 1.45rem; line-height: 1.42; font-weight: 500;
      color: #f4ecd8; margin: 0;
    }
    .km-ld-card-bridge {
      font-size: 0.9rem; line-height: 1.4; color: #e8c96a;
      padding-top: 12px; border-top: 1px dashed rgba(201,168,76,0.3);
    }
    .km-ld-pausedbar {
      text-align: center; font-size: 0.72rem; font-weight: 700;
      letter-spacing: 0.12em; text-transform: uppercase; color: #e0a32e; padding: 4px 0;
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
    .km-ld-myturn {
      margin: 7px 12px; --background: linear-gradient(180deg, #e8c96a, #c9a84c);
      --color: #14110b; font-weight: 700; --box-shadow: 0 7px 18px rgba(0,0,0,0.5);
    }
    .km-ld-turndot {
      display: inline-block; width: 8px; height: 8px; border-radius: 50%;
      margin-right: 6px; vertical-align: middle;
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
  roster = signal<RosterEntry[]>([]);
  you = signal<RosterEntry | null>(null);

  private ws: WebSocket | null = null;
  private leaving = false;
  private reconnectAttempts = 0;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private firstPosition = true;

  @ViewChildren('cardEl', { read: ElementRef })
  private cardRefs!: QueryList<ElementRef<HTMLElement>>;

  // ── Derived state ────────────────────────────────────────────────────────────

  isHost = computed(() => this.role() === 'host');
  inLobby = computed(() => this.cursor().section < 0);

  /** Identified cast members currently connected (named entries only). */
  namedRoster = computed(() => this.roster().filter((r) => !!r.name));
  /** Connected screens that did not resolve to a cast member. */
  guestCount = computed(() => this.roster().filter((r) => !r.name).length);

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
      setTimeout(() => this.positionCards(), 90);
    }
    this.cdr.markForCheck();
  }

  /** Lay the cards out as a 3D fanned hand, GSAP-animated between states. */
  private positionCards(): void {
    const refs = this.cardRefs?.toArray() ?? [];
    if (refs.length === 0) return;
    const active = this.activeIndex();
    const duration = this.firstPosition ? 0 : 0.55;
    refs.forEach((ref, i) => {
      const offset = i - active;
      const abs = Math.abs(offset);
      const visible = abs <= 4;
      gsap.to(ref.nativeElement, {
        rotation: offset * 9,
        x: offset * 32,
        y: abs * 8,
        z: -abs * 60,
        scale: abs === 0 ? 1 : Math.max(0.78, 1 - abs * 0.08),
        opacity: visible ? Math.max(0.18, 1 - abs * 0.22) : 0,
        zIndex: 100 - abs,
        duration,
        ease: 'power3.out',
        overwrite: 'auto',
      });
    });
    this.firstPosition = false;
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
