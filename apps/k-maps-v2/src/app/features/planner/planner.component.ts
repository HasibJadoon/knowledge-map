import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  signal,
  computed,
} from '@angular/core';
import { Router } from '@angular/router';
import gsap from 'gsap';
import { environment } from '../../../../environments/environment';

type ViewMode = 'calendar' | 'kanban' | 'timeline';
type PlanStatus = 'active' | 'completed' | 'paused';
type PlanType = 'reading' | 'research' | 'memorisation' | 'mixed' | string;

interface Plan {
  id: string;
  title: string;
  type: PlanType;
  start_date?: string;
  end_date?: string;
  status: PlanStatus;
  description?: string;
}

interface CalendarDay {
  date: Date;
  isToday: boolean;
  isCurrentMonth: boolean;
  plans: Plan[];
}

const TYPE_COLORS: Record<string, string> = {
  reading: '#1a3a6e',
  research: '#3a1a6e',
  memorisation: '#1a6e3a',
  mixed: '#6e4a1a',
};

const TYPE_TEXT_COLORS: Record<string, string> = {
  reading: '#60a5fa',
  research: '#a78bfa',
  memorisation: '#4ade80',
  mixed: '#fbbf24',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

@Component({
  selector: 'km-planner',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pl" #page>

      <!-- Ambient background -->
      <div class="pl__bg" aria-hidden="true">
        @for (p of particles; track p) {
          <span class="pl__particle" [style.--i]="p"></span>
        }
      </div>

      <!-- Header -->
      <header class="pl__header" #header>
        <button class="pl__back" (click)="goBack()" aria-label="Back to landing">
          <span>←</span>
          <span>Landing</span>
        </button>

        <div class="pl__title-group">
          <p class="pl__eyebrow">Study Plans</p>
          <h1 class="pl__title">Planner</h1>
          <div class="pl__rule"></div>
        </div>

        <div class="pl__header-actions">
          <!-- View toggle -->
          <div class="pl__view-toggle" role="group" aria-label="View mode">
            @for (v of viewModes; track v.id) {
              <button
                class="pl__view-btn"
                [class.pl__view-btn--active]="activeView() === v.id"
                (click)="switchView(v.id)"
                [attr.aria-pressed]="activeView() === v.id"
              >
                <span class="pl__view-btn-icon">{{ v.icon }}</span>
                <span>{{ v.label }}</span>
              </button>
            }
          </div>

          <button class="pl__add-btn" (click)="addTask()" aria-label="Add new task">
            ＋ Add Task
          </button>
        </div>
      </header>

      <!-- Main area -->
      <main class="pl__main" #main>

        @if (loading()) {
          <div class="pl__state">
            <div class="pl__spinner"></div>
            <p class="pl__state-text">Loading plans…</p>
          </div>
        }

        @if (!loading() && error()) {
          <div class="pl__state pl__state--error">
            <span class="pl__state-icon">⚠</span>
            <p class="pl__state-text">{{ error() }}</p>
            <button class="pl__retry-btn" (click)="loadPlans()">Retry</button>
          </div>
        }

        @if (!loading() && !error()) {

          <!-- ── CALENDAR VIEW ── -->
          @if (activeView() === 'calendar') {
            <div class="pl__calendar" #viewEl>

              <!-- Month nav -->
              <div class="pl__cal-nav">
                <button class="pl__cal-nav-btn" (click)="prevMonth()" aria-label="Previous month">‹</button>
                <h2 class="pl__cal-month">{{ MONTHS[calendarMonth()] }} {{ calendarYear() }}</h2>
                <button class="pl__cal-nav-btn" (click)="nextMonth()" aria-label="Next month">›</button>
              </div>

              <!-- Day headers -->
              <div class="pl__cal-grid pl__cal-grid--header">
                @for (d of DAYS; track d) {
                  <div class="pl__cal-day-label">{{ d }}</div>
                }
              </div>

              <!-- Day cells -->
              <div class="pl__cal-grid pl__cal-grid--cells">
                @for (day of calendarDays(); track day.date.getTime()) {
                  <div
                    class="pl__cal-cell"
                    [class.pl__cal-cell--today]="day.isToday"
                    [class.pl__cal-cell--other-month]="!day.isCurrentMonth"
                  >
                    <span class="pl__cal-date">{{ day.date.getDate() }}</span>
                    @for (plan of day.plans.slice(0, 3); track plan.id) {
                      <div
                        class="pl__cal-plan-bar"
                        [style.background]="typeColor(plan.type)"
                        [style.color]="typeTextColor(plan.type)"
                        [attr.title]="plan.title"
                      >
                        {{ plan.title }}
                      </div>
                    }
                    @if (day.plans.length > 3) {
                      <div class="pl__cal-more">+{{ day.plans.length - 3 }} more</div>
                    }
                  </div>
                }
              </div>
            </div>
          }

          <!-- ── KANBAN VIEW ── -->
          @if (activeView() === 'kanban') {
            <div class="pl__kanban" #viewEl>
              @for (col of kanbanColumns; track col.status) {
                <div class="pl__col">
                  <div class="pl__col-header">
                    <span class="pl__col-title">{{ col.label }}</span>
                    <span class="pl__col-count">{{ plansByStatus(col.status).length }}</span>
                  </div>
                  <div class="pl__col-body">
                    @if (plansByStatus(col.status).length === 0) {
                      <div class="pl__col-empty">No plans</div>
                    }
                    @for (plan of plansByStatus(col.status); track plan.id) {
                      <div class="pl__kanban-card">
                        <div class="pl__kanban-card-top">
                          <span
                            class="pl__type-badge"
                            [style.background]="typeColor(plan.type)"
                            [style.color]="typeTextColor(plan.type)"
                          >{{ plan.type }}</span>
                          <span class="pl__drag-handle" aria-hidden="true">⠿</span>
                        </div>
                        <p class="pl__kanban-card-title">{{ plan.title }}</p>
                        @if (plan.start_date || plan.end_date) {
                          <p class="pl__kanban-card-dates">
                            @if (plan.start_date) { <span>{{ formatShortDate(plan.start_date) }}</span> }
                            @if (plan.start_date && plan.end_date) { <span> → </span> }
                            @if (plan.end_date) { <span>{{ formatShortDate(plan.end_date) }}</span> }
                          </p>
                        }
                        @if (plan.description) {
                          <p class="pl__kanban-card-desc">{{ plan.description }}</p>
                        }
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }

          <!-- ── TIMELINE VIEW ── -->
          @if (activeView() === 'timeline') {
            <div class="pl__timeline" #viewEl>
              @if (plans().length === 0) {
                <div class="pl__state">
                  <span class="pl__state-icon">◆</span>
                  <p class="pl__state-title">No Plans Yet</p>
                  <p class="pl__state-text">Add your first study plan to get started.</p>
                  <button class="pl__add-btn" (click)="addTask()">＋ Add Task</button>
                </div>
              } @else {
                <div class="pl__timeline-list">
                  @for (plan of sortedPlans(); track plan.id) {
                    <div class="pl__timeline-item">
                      <div class="pl__timeline-left">
                        @if (plan.start_date) {
                          <span class="pl__timeline-date-day">{{ formatDayNum(plan.start_date) }}</span>
                          <span class="pl__timeline-date-mon">{{ formatMonAbbr(plan.start_date) }}</span>
                          <span class="pl__timeline-date-yr">{{ formatYear(plan.start_date) }}</span>
                        } @else {
                          <span class="pl__timeline-date-mon">—</span>
                        }
                      </div>
                      <div class="pl__timeline-connector">
                        <div class="pl__timeline-dot" [style.background]="typeTextColor(plan.type)"></div>
                        <div class="pl__timeline-line"></div>
                      </div>
                      <div class="pl__timeline-card">
                        <div class="pl__timeline-card-top">
                          <span
                            class="pl__type-badge"
                            [style.background]="typeColor(plan.type)"
                            [style.color]="typeTextColor(plan.type)"
                          >{{ plan.type }}</span>
                          <span
                            class="pl__status-pill"
                            [class]="'pl__status-pill--' + plan.status"
                          >{{ plan.status }}</span>
                        </div>
                        <h3 class="pl__timeline-card-title">{{ plan.title }}</h3>
                        @if (plan.description) {
                          <p class="pl__timeline-card-desc">{{ plan.description }}</p>
                        }
                        @if (plan.end_date) {
                          <p class="pl__timeline-card-end">
                            Ends {{ formatShortDate(plan.end_date) }}
                          </p>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }

        }
      </main>
    </div>
  `,
  styles: [`
    .pl {
      position: relative;
      width: 100%; height: 100dvh;
      display: flex; flex-direction: column;
      overflow: hidden;
      background: radial-gradient(ellipse 80% 60% at 50% 20%, #0a0814 0%, #080808 60%, #000 100%);
    }

    /* Particles */
    .pl__bg { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
    .pl__particle {
      position: absolute; width: 2px; height: 2px; border-radius: 50%;
      background: var(--km-gold); opacity: 0;
      animation: pl-float calc(10s + var(--i, 0) * 1.1s) infinite linear;
      left: calc(var(--i, 0) * 8% + 3%); top: 100%;
      animation-delay: calc(var(--i, 0) * 0.55s);
    }
    @keyframes pl-float {
      0%   { transform: translateY(0) scale(1); opacity: 0; }
      10%  { opacity: .45; }
      80%  { opacity: .08; }
      100% { transform: translateY(-100vh) scale(.3); opacity: 0; }
    }

    /* ── Header ── */
    .pl__header {
      position: relative; z-index: 10;
      display: flex; align-items: center; justify-content: space-between;
      padding: 1.4rem 2rem 1rem;
      border-bottom: 1px solid rgba(255,255,255,.06);
      flex-shrink: 0; gap: 1rem; flex-wrap: wrap;
    }

    .pl__back {
      display: flex; align-items: center; gap: .5rem;
      background: transparent; border: 1px solid rgba(255,255,255,.1);
      border-radius: 8px; padding: .45rem .9rem;
      color: var(--km-text-2); font-size: .78rem; letter-spacing: .06em;
      cursor: pointer; transition: border-color .2s, color .2s; white-space: nowrap;
      font-family: var(--km-font-body);
      &:hover { border-color: var(--km-gold); color: var(--km-gold); }
    }

    .pl__title-group { text-align: center; flex-shrink: 0; }

    .pl__eyebrow {
      font-size: .64rem; font-weight: 600; letter-spacing: .22em;
      text-transform: uppercase; color: var(--km-gold); opacity: .65;
      font-family: var(--km-font-body);
    }

    .pl__title {
      font-family: var(--km-font-heading);
      font-size: clamp(1.6rem, 3.5vw, 2.4rem); font-weight: 700; letter-spacing: .08em;
      background: linear-gradient(135deg, var(--km-gold-bright) 0%, var(--km-gold) 55%, #a07830 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      line-height: 1; margin-bottom: .4rem;
    }

    .pl__rule {
      width: 36px; height: 1px;
      background: linear-gradient(90deg, transparent, var(--km-gold), transparent);
      margin: 0 auto;
    }

    .pl__header-actions {
      display: flex; align-items: center; gap: .8rem; flex-wrap: wrap;
    }

    /* View toggle */
    .pl__view-toggle {
      display: flex; align-items: center;
      background: rgba(255,255,255,.04);
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 10px; overflow: hidden;
    }

    .pl__view-btn {
      display: flex; align-items: center; gap: .35rem;
      padding: .45rem .9rem;
      background: transparent; border: none;
      color: var(--km-text-3); font-size: .78rem; letter-spacing: .06em;
      cursor: pointer; transition: background .2s, color .2s;
      font-family: var(--km-font-body); white-space: nowrap;

      &:hover { color: var(--km-text-2); }

      &.pl__view-btn--active {
        background: rgba(201,168,76,.15);
        color: var(--km-gold);
      }
    }

    .pl__view-btn-icon { font-size: .85rem; }

    /* Add button */
    .pl__add-btn {
      display: flex; align-items: center; gap: .4rem;
      background: linear-gradient(135deg, rgba(201,168,76,.18), rgba(201,168,76,.06));
      border: 1px solid var(--km-border-gold);
      border-radius: 8px; padding: .45rem 1.1rem;
      color: var(--km-gold); font-size: .8rem; letter-spacing: .06em;
      cursor: pointer; transition: background .2s, box-shadow .2s;
      font-family: var(--km-font-body); white-space: nowrap;
      &:hover {
        background: linear-gradient(135deg, rgba(201,168,76,.28), rgba(201,168,76,.12));
        box-shadow: 0 0 20px rgba(201,168,76,.2);
      }
    }

    /* ── Main ── */
    .pl__main {
      flex: 1; overflow: hidden; position: relative;
      display: flex; flex-direction: column;
    }

    /* States */
    .pl__state {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 1rem; flex: 1; min-height: 40vh; text-align: center; padding: 2rem;
    }

    .pl__state-icon {
      font-size: 2.5rem; opacity: .3;
      background: linear-gradient(135deg, var(--km-gold-bright), var(--km-gold));
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }

    .pl__state-title {
      font-family: var(--km-font-heading); font-size: 1.1rem; font-weight: 600;
      color: var(--km-text-2); letter-spacing: .06em;
    }

    .pl__state-text { font-size: .85rem; color: var(--km-text-3); line-height: 1.6; max-width: 320px; }

    .pl__spinner {
      width: 34px; height: 34px;
      border: 2px solid rgba(201,168,76,.15); border-top-color: var(--km-gold);
      border-radius: 50%; animation: pl-spin .8s linear infinite;
    }
    @keyframes pl-spin { to { transform: rotate(360deg); } }

    .pl__retry-btn {
      background: transparent; border: 1px solid rgba(255,255,255,.15);
      border-radius: 6px; padding: .4rem 1rem;
      color: var(--km-text-2); font-size: .8rem; cursor: pointer;
      transition: border-color .2s; font-family: var(--km-font-body);
      &:hover { border-color: var(--km-gold); color: var(--km-gold); }
    }

    /* ── CALENDAR ── */
    .pl__calendar {
      flex: 1; display: flex; flex-direction: column;
      padding: 1.5rem 2rem; gap: 1rem; overflow: hidden;
    }

    .pl__cal-nav {
      display: flex; align-items: center; justify-content: center; gap: 1.5rem;
      flex-shrink: 0;
    }

    .pl__cal-nav-btn {
      width: 36px; height: 36px; border-radius: 50%;
      background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1);
      color: var(--km-text-2); font-size: 1.2rem; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: border-color .2s, color .2s;
      &:hover { border-color: var(--km-gold); color: var(--km-gold); }
    }

    .pl__cal-month {
      font-family: var(--km-font-heading); font-size: 1.15rem; font-weight: 600;
      letter-spacing: .08em; color: var(--km-text); min-width: 200px; text-align: center;
    }

    .pl__cal-grid {
      display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px;
    }

    .pl__cal-grid--header { flex-shrink: 0; }

    .pl__cal-day-label {
      text-align: center; padding: .4rem 0;
      font-size: .65rem; font-weight: 700; letter-spacing: .14em;
      text-transform: uppercase; color: var(--km-text-3);
      font-family: var(--km-font-body);
    }

    .pl__cal-grid--cells {
      flex: 1; overflow-y: auto;
      grid-template-rows: repeat(6, minmax(0, 1fr));
      scrollbar-width: thin; scrollbar-color: rgba(201,168,76,.3) transparent;
    }

    .pl__cal-cell {
      background: rgba(255,255,255,.02);
      border: 1px solid rgba(255,255,255,.05);
      padding: .4rem; min-height: 70px;
      display: flex; flex-direction: column; gap: 2px;
      transition: background .2s;
      &:hover { background: rgba(255,255,255,.04); }
    }

    .pl__cal-cell--today {
      border-color: rgba(201,168,76,.5);
      box-shadow: inset 0 0 0 1px rgba(201,168,76,.3);
      .pl__cal-date {
        background: var(--km-gold);
        color: #000; font-weight: 700;
        width: 22px; height: 22px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
      }
    }

    .pl__cal-cell--other-month { opacity: .35; }

    .pl__cal-date {
      font-size: .72rem; color: var(--km-text-3); font-family: var(--km-font-body);
      margin-bottom: 2px; display: block;
    }

    .pl__cal-plan-bar {
      font-size: .58rem; font-weight: 600; letter-spacing: .04em;
      padding: 1px 4px; border-radius: 3px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      font-family: var(--km-font-body);
    }

    .pl__cal-more {
      font-size: .55rem; color: var(--km-text-3); font-family: var(--km-font-body);
    }

    /* ── KANBAN ── */
    .pl__kanban {
      flex: 1; display: flex; gap: 1.2rem;
      padding: 1.5rem 2rem; overflow-x: auto;
      scrollbar-width: thin; scrollbar-color: rgba(201,168,76,.3) transparent;
    }

    .pl__col {
      flex: 0 0 300px; min-width: 280px;
      display: flex; flex-direction: column;
      background: rgba(255,255,255,.025);
      border: 1px solid rgba(255,255,255,.07);
      border-radius: var(--km-radius-lg, 14px);
      overflow: hidden;
    }

    .pl__col-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem 1.2rem;
      border-bottom: 1px solid rgba(255,255,255,.07);
      background: rgba(255,255,255,.03);
      flex-shrink: 0;
    }

    .pl__col-title {
      font-family: var(--km-font-heading);
      font-size: .78rem; font-weight: 700; letter-spacing: .14em;
      text-transform: uppercase; color: var(--km-text-2);
    }

    .pl__col-count {
      font-size: .7rem; font-weight: 700;
      background: rgba(201,168,76,.15); color: var(--km-gold);
      padding: .15rem .5rem; border-radius: 12px;
      font-family: var(--km-font-body);
    }

    .pl__col-body {
      flex: 1; overflow-y: auto; padding: .8rem;
      display: flex; flex-direction: column; gap: .75rem;
      scrollbar-width: thin; scrollbar-color: rgba(201,168,76,.2) transparent;
    }

    .pl__col-empty {
      font-size: .78rem; color: var(--km-text-3); text-align: center;
      padding: 2rem 1rem; opacity: .5; font-family: var(--km-font-body);
    }

    .pl__kanban-card {
      background: rgba(255,255,255,.04);
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 10px; padding: .9rem 1rem;
      transition: border-color .2s, box-shadow .2s;
      &:hover {
        border-color: rgba(201,168,76,.2);
        box-shadow: 0 2px 16px rgba(0,0,0,.3);
      }
    }

    .pl__kanban-card-top {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: .6rem;
    }

    .pl__drag-handle {
      font-size: .8rem; color: var(--km-text-3); opacity: .4; cursor: grab;
      &:active { cursor: grabbing; }
    }

    .pl__kanban-card-title {
      font-size: .9rem; font-weight: 600; color: var(--km-text);
      font-family: var(--km-font-body); margin-bottom: .4rem; line-height: 1.35;
    }

    .pl__kanban-card-dates {
      font-size: .7rem; color: var(--km-text-3); font-family: var(--km-font-body);
      margin-bottom: .3rem;
    }

    .pl__kanban-card-desc {
      font-size: .74rem; color: var(--km-text-3); line-height: 1.5;
      font-family: var(--km-font-body);
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }

    /* ── TIMELINE ── */
    .pl__timeline {
      flex: 1; overflow-y: auto; padding: 1.5rem 2rem;
      scrollbar-width: thin; scrollbar-color: rgba(201,168,76,.3) transparent;
    }

    .pl__timeline-list {
      max-width: 780px; margin: 0 auto;
      display: flex; flex-direction: column; gap: 0;
    }

    .pl__timeline-item {
      display: flex; gap: 1.2rem; padding-bottom: 1.4rem;
    }

    .pl__timeline-left {
      width: 64px; flex-shrink: 0;
      display: flex; flex-direction: column; align-items: flex-end;
      padding-top: .2rem;
    }

    .pl__timeline-date-day {
      font-family: var(--km-font-heading);
      font-size: 1.6rem; font-weight: 700; color: var(--km-text-2); line-height: 1;
    }

    .pl__timeline-date-mon {
      font-size: .65rem; font-weight: 700; letter-spacing: .1em;
      text-transform: uppercase; color: var(--km-gold); opacity: .7;
      font-family: var(--km-font-body);
    }

    .pl__timeline-date-yr {
      font-size: .6rem; color: var(--km-text-3); font-family: var(--km-font-body);
    }

    .pl__timeline-connector {
      display: flex; flex-direction: column; align-items: center;
      flex-shrink: 0; padding-top: .3rem; gap: 0;
    }

    .pl__timeline-dot {
      width: 10px; height: 10px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,.1);
      flex-shrink: 0; z-index: 2;
    }

    .pl__timeline-line {
      flex: 1; width: 1px; background: rgba(255,255,255,.08); min-height: 40px;
    }

    .pl__timeline-card {
      flex: 1;
      background: rgba(255,255,255,.03);
      border: 1px solid rgba(255,255,255,.07);
      border-radius: var(--km-radius-lg, 14px);
      padding: 1rem 1.2rem;
      transition: border-color .2s, box-shadow .2s;
      &:hover {
        border-color: rgba(201,168,76,.2);
        box-shadow: 0 4px 20px rgba(0,0,0,.3);
      }
    }

    .pl__timeline-card-top {
      display: flex; align-items: center; gap: .6rem; margin-bottom: .6rem;
    }

    .pl__timeline-card-title {
      font-family: var(--km-font-heading);
      font-size: 1rem; font-weight: 600; color: var(--km-text);
      margin-bottom: .4rem; letter-spacing: .03em;
    }

    .pl__timeline-card-desc {
      font-size: .8rem; color: var(--km-text-3); line-height: 1.55;
      font-family: var(--km-font-body); margin-bottom: .4rem;
    }

    .pl__timeline-card-end {
      font-size: .7rem; color: var(--km-text-3); font-family: var(--km-font-body);
      opacity: .7;
    }

    /* Shared */
    .pl__type-badge {
      font-size: .58rem; font-weight: 700; letter-spacing: .12em;
      text-transform: uppercase; padding: .2rem .5rem; border-radius: 4px;
      font-family: var(--km-font-body);
    }

    .pl__status-pill {
      font-size: .58rem; font-weight: 700; letter-spacing: .1em;
      text-transform: uppercase; padding: .2rem .5rem; border-radius: 4px;
      font-family: var(--km-font-body);
    }
    .pl__status-pill--active { background: rgba(26,110,58,.3); color: #4ade80; }
    .pl__status-pill--completed { background: rgba(30,64,175,.3); color: #93c5fd; }
    .pl__status-pill--paused { background: rgba(120,53,15,.3); color: #fcd34d; }
  `],
})
export class PlannerComponent implements OnInit, AfterViewInit {
  private readonly router = inject(Router);

  @ViewChild('header') headerRef!: ElementRef<HTMLElement>;
  @ViewChild('main') mainRef!: ElementRef<HTMLElement>;

  readonly plans = signal<Plan[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly activeView = signal<ViewMode>('calendar');

  readonly calendarMonth = signal(new Date().getMonth());
  readonly calendarYear = signal(new Date().getFullYear());

  readonly particles = Array.from({ length: 12 }, (_, i) => i);

  readonly DAYS = DAYS;
  readonly MONTHS = MONTHS;

  readonly viewModes: { id: ViewMode; label: string; icon: string }[] = [
    { id: 'calendar', label: 'Calendar', icon: '⊞' },
    { id: 'kanban', label: 'Kanban', icon: '▦' },
    { id: 'timeline', label: 'Timeline', icon: '◆' },
  ];

  readonly kanbanColumns: { status: PlanStatus; label: string }[] = [
    { status: 'active', label: 'Active' },
    { status: 'paused', label: 'Paused' },
    { status: 'completed', label: 'Completed' },
  ];

  readonly calendarDays = computed<CalendarDay[]>(() => {
    const year = this.calendarYear();
    const month = this.calendarMonth();
    const today = new Date();
    const plansData = this.plans();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: CalendarDay[] = [];

    // Fill leading blank days from previous month
    const startWeekday = firstDay.getDay();
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, isToday: false, isCurrentMonth: false, plans: [] });
    }

    // Fill current month days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const isToday =
        today.getFullYear() === year &&
        today.getMonth() === month &&
        today.getDate() === d;

      const dayPlans = plansData.filter((p) => {
        if (!p.start_date) return false;
        const sd = new Date(p.start_date);
        return sd.getFullYear() === year && sd.getMonth() === month && sd.getDate() === d;
      });

      days.push({ date, isToday, isCurrentMonth: true, plans: dayPlans });
    }

    // Fill trailing days to complete the grid (6 rows × 7 = 42)
    const total = 42;
    let nextDay = 1;
    while (days.length < total) {
      const date = new Date(year, month + 1, nextDay++);
      days.push({ date, isToday: false, isCurrentMonth: false, plans: [] });
    }

    return days;
  });

  readonly sortedPlans = computed(() =>
    [...this.plans()].sort((a, b) => {
      const da = a.start_date ? new Date(a.start_date).getTime() : 0;
      const db = b.start_date ? new Date(b.start_date).getTime() : 0;
      return da - db;
    })
  );

  ngOnInit(): void {
    void this.loadPlans();
  }

  ngAfterViewInit(): void {
    gsap.fromTo(
      this.headerRef.nativeElement,
      { opacity: 0, y: -24, filter: 'blur(6px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: .9, ease: 'power3.out', clearProps: 'filter' }
    );
    gsap.fromTo(
      this.mainRef.nativeElement,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: .7, ease: 'power3.out', delay: .4 }
    );
  }

  async loadPlans(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch(`${environment.wvBase}/wv/plans?limit=50`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { ok: boolean; plans: Plan[] };
      this.plans.set(data.plans ?? []);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Failed to load plans');
    } finally {
      this.loading.set(false);
    }
  }

  plansByStatus(status: PlanStatus): Plan[] {
    return this.plans().filter((p) => p.status === status);
  }

  switchView(view: ViewMode): void {
    if (this.activeView() === view) return;
    const main = this.mainRef.nativeElement;
    gsap.fromTo(main, { opacity: .4 }, { opacity: 1, duration: .35, ease: 'power2.out' });
    this.activeView.set(view);
    setTimeout(() => {
      const viewEl = main.querySelector('.pl__calendar, .pl__kanban, .pl__timeline');
      if (viewEl) {
        gsap.fromTo(viewEl, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .4, ease: 'power3.out' });
      }
    }, 0);
  }

  prevMonth(): void {
    const m = this.calendarMonth();
    const y = this.calendarYear();
    if (m === 0) {
      this.calendarMonth.set(11);
      this.calendarYear.set(y - 1);
    } else {
      this.calendarMonth.set(m - 1);
    }
  }

  nextMonth(): void {
    const m = this.calendarMonth();
    const y = this.calendarYear();
    if (m === 11) {
      this.calendarMonth.set(0);
      this.calendarYear.set(y + 1);
    } else {
      this.calendarMonth.set(m + 1);
    }
  }

  goBack(): void {
    void this.router.navigateByUrl('/landing');
  }

  addTask(): void {
    // Navigate to hub planner section for data entry
    void this.router.navigateByUrl('/hub/worldview/plans');
  }

  typeColor(type: PlanType): string {
    return TYPE_COLORS[type] ?? 'rgba(201,168,76,.15)';
  }

  typeTextColor(type: PlanType): string {
    return TYPE_TEXT_COLORS[type] ?? '#c9a84c';
  }

  formatShortDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  }

  formatDayNum(dateStr: string): string {
    try {
      return String(new Date(dateStr).getDate()).padStart(2, '0');
    } catch {
      return '--';
    }
  }

  formatMonAbbr(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
    } catch {
      return '---';
    }
  }

  formatYear(dateStr: string): string {
    try {
      return String(new Date(dateStr).getFullYear());
    } catch {
      return '';
    }
  }
}
