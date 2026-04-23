import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  ViewChild,
} from '@angular/core';

// ─── Minimal YT IFrame API typings ───────────────────────────────────────────

interface YTPlayerOptions {
  height: string | number;
  width: string | number;
  videoId: string;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (event: { target: YTPlayer }) => void;
    onStateChange?: (event: { data: number }) => void;
  };
}

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  destroy(): void;
}

interface YTNamespace {
  Player: new (el: HTMLElement | string, opts: YTPlayerOptions) => YTPlayer;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
}

// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'km-youtube-player',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './youtube-player.component.html',
})
export class YoutubePlayerComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) videoId!: string;
  @ViewChild('playerContainer') private containerRef!: ElementRef<HTMLDivElement>;

  private player: YTPlayer | null = null;

  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      if (this.isApiLoaded()) {
        this.createPlayer();
      } else {
        this.loadApiScript();
      }
    });
  }

  ngOnDestroy(): void {
    this.player?.destroy();
    this.player = null;
  }

  // ─── Public control API ───────────────────────────────────────────────────

  play(): void {
    this.player?.playVideo();
  }

  pause(): void {
    this.player?.pauseVideo();
  }

  seekTo(seconds: number): void {
    this.player?.seekTo(seconds, true);
  }

  getCurrentTime(): number {
    return this.player?.getCurrentTime() ?? 0;
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private isApiLoaded(): boolean {
    return typeof (window as unknown as { YT?: YTNamespace }).YT !== 'undefined';
  }

  private loadApiScript(): void {
    if (document.getElementById('yt-iframe-api')) {
      // Script tag already injected — wait for the callback
      this.waitForApi();
      return;
    }
    const script = document.createElement('script');
    script.id = 'yt-iframe-api';
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
    this.waitForApi();
  }

  private waitForApi(): void {
    const win = window as unknown as {
      YT?: YTNamespace;
      onYouTubeIframeAPIReady?: () => void;
    };
    const prev = win.onYouTubeIframeAPIReady;
    win.onYouTubeIframeAPIReady = () => {
      prev?.();
      this.createPlayer();
    };
  }

  private createPlayer(): void {
    const yt = (window as unknown as { YT: YTNamespace }).YT;
    this.player = new yt.Player(this.containerRef.nativeElement, {
      height: '100%',
      width: '100%',
      videoId: this.videoId,
      playerVars: {
        rel: 0,
        modestbranding: 1,
        color: 'white',
      },
      events: {
        onReady: () => {
          // Player is ready; no action needed — parent polls getCurrentTime()
        },
      },
    });
  }
}
