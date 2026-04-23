import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  NgZone,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

import { YoutubePlayerComponent } from '../../components/youtube-player/youtube-player.component';
import { SceneListComponent } from '../../components/scene-list/scene-list.component';
import { TranscriptPanelComponent } from '../../components/transcript-panel/transcript-panel.component';
import { VocabPanelComponent } from '../../components/vocab-panel/vocab-panel.component';
import { CameraPlaceholderComponent } from '../../components/camera-placeholder/camera-placeholder.component';

import { ReactionLessonData, Scene, SceneContent } from '../../reaction.models';
import { MOCK_REACTION_LESSON } from '../../reaction.mock';

@Component({
  selector: 'km-reaction-screen',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    YoutubePlayerComponent,
    SceneListComponent,
    TranscriptPanelComponent,
    VocabPanelComponent,
    CameraPlaceholderComponent,
  ],
  templateUrl: './reaction-screen.component.html',
  styleUrl: './reaction-screen.component.css',
})
export class ReactionScreenComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(YoutubePlayerComponent) private ytPlayer?: YoutubePlayerComponent;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);

  // ── Lesson data ───────────────────────────────────────────────────────────
  lesson = signal<ReactionLessonData | null>(null);

  // ── Left panel ────────────────────────────────────────────────────────────
  leftCollapsed = signal(false);

  // ── Playback state ────────────────────────────────────────────────────────
  /** Current video time in seconds, updated every 200ms */
  currentTime = signal(0);

  /** ID of the transcript line currently covering currentTime */
  activeLineId = computed<string | null>(() => {
    const t = this.currentTime();
    const data = this.lesson();
    if (!data) return null;
    const line = data.transcript.find((l) => t >= l.start && t < l.end);
    return line?.id ?? null;
  });

  /** ID of the scene covering the active transcript line */
  activeSceneId = computed<string | null>(() => {
    const lineId = this.activeLineId();
    const data = this.lesson();
    if (!data || !lineId) return null;
    const line = data.transcript.find((l) => l.id === lineId);
    return line?.sceneId ?? null;
  });

  /** SceneContent for the active scene — drives the right panel */
  activeContent = computed<SceneContent | null>(() => {
    const sceneId = this.activeSceneId();
    const data = this.lesson();
    if (!data || !sceneId) return null;
    return data.content.find((c) => c.sceneId === sceneId) ?? null;
  });

  // ── Polling ───────────────────────────────────────────────────────────────
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private lastActiveLineId: string | null = null;

  // ─────────────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    const unitId = this.route.snapshot.paramMap.get('unitId');
    // In production: fetch from API using unitId.
    // For now, use mock data regardless of the id.
    const data = { ...MOCK_REACTION_LESSON, unitId: unitId ?? MOCK_REACTION_LESSON.unitId };
    this.lesson.set(data);
  }

  ngAfterViewInit(): void {
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  // ── Polling loop ──────────────────────────────────────────────────────────

  private startPolling(): void {
    this.zone.runOutsideAngular(() => {
      this.pollInterval = setInterval(() => {
        const time = this.ytPlayer?.getCurrentTime() ?? 0;
        const currentLineId = this.computeActiveLineId(time);

        // Only enter Angular zone (trigger CD) when the active line changes
        if (currentLineId !== this.lastActiveLineId) {
          this.lastActiveLineId = currentLineId;
          this.zone.run(() => {
            this.currentTime.set(time);
            this.cdr.markForCheck();
          });
        } else {
          // Still update time silently so computed() values stay fresh
          this.currentTime.set(time);
        }
      }, 200);
    });
  }

  private stopPolling(): void {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private computeActiveLineId(t: number): string | null {
    const data = this.lesson();
    if (!data) return null;
    return data.transcript.find((l) => t >= l.start && t < l.end)?.id ?? null;
  }

  // ── Event handlers ────────────────────────────────────────────────────────

  onSceneSelect(scene: Scene): void {
    this.ytPlayer?.seekTo(scene.start);
    this.ytPlayer?.play();
    this.currentTime.set(scene.start);
    this.cdr.markForCheck();
  }

  onTranscriptSeek(seconds: number): void {
    this.ytPlayer?.seekTo(seconds);
    this.ytPlayer?.play();
    this.currentTime.set(seconds);
    this.cdr.markForCheck();
  }

  toggleLeft(): void {
    this.leftCollapsed.update((v) => !v);
  }

  back(): void {
    this.router.navigate(['/arabic/library']);
  }
}
