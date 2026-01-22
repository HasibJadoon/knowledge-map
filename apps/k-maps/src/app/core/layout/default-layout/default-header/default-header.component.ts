import { NgFor, NgIf, NgSwitch, NgSwitchCase, NgTemplateOutlet } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';

import {
  AvatarComponent,
  BadgeComponent,
  BreadcrumbRouterComponent,
  ContainerComponent,
  DropdownComponent,
  DropdownMenuDirective,
  DropdownToggleDirective,
  HeaderComponent,
  HeaderNavComponent,
  HeaderTogglerDirective,
  SidebarToggleDirective
} from '@coreui/angular';

import { IconDirective } from '@coreui/icons-angular';
import { AuthService } from '../../../../shared/services/AuthService';
import { HeaderSearchComponent } from '../../../../shared/components/header-search/header-search.component';

@Component({
  selector: 'app-default-header',
  templateUrl: './default-header.component.html',
  styleUrls: ['./default-header.component.scss'],
  imports: [
    ContainerComponent,
    HeaderTogglerDirective,
    SidebarToggleDirective,
    IconDirective,
    HeaderNavComponent,
    NgTemplateOutlet,
    NgIf,
    NgFor,
    NgSwitch,
    NgSwitchCase,
    RouterLink,
    BreadcrumbRouterComponent,
    DropdownComponent,
    DropdownToggleDirective,
    DropdownMenuDirective,
    HeaderSearchComponent
  ]
})
export class DefaultHeaderComponent extends HeaderComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  sidebarId = input('sidebar1');

  fontSize = 16;
  arabicFontSize = 23;
  currentUrl = '';
  showHeaderSearch = false;
  headerQuery = '';
  headerPlaceholder = 'Search';
  headerActionLabel = '';
  headerActionKind:
    | 'lesson-new'
    | 'roots-refresh'
    | 'roots-new'
    | 'lesson-edit'
    | 'lesson-study'
    | 'worldview-new'
    | '' = '';
  headerSecondaryLabel = '';
  headerSecondaryKind: 'refresh' | '' = '';
  headerTertiaryLabel = '';
  headerTertiaryKind: 'lesson-claude' | '' = '';
  showDiscourseFilters = false;
  discourseFilters = [
    { key: 'Epistemology', label: 'Epistemology' },
    { key: 'Law', label: 'Law' },
    { key: 'Morality', label: 'Morality' },
    { key: 'Power', label: 'Power' },
    { key: 'Society', label: 'Society' },
    { key: 'Narrative', label: 'Narrative' },
  ];
  activeDiscourseFilters = new Set<string>();
  private currentPath = '';

  readonly scriptModes = ['Uthmani', 'IndoPak', 'Tajweed'];
  readonly fontStyles = ['Uthmanic Hafs'];
  readonly reciters = [
    { id: 'afasy', name: 'Mishari Rashid al-ʿAfasy', detail: 'Mecca · Hafs' },
    { id: 'abdulbasit', name: 'Abdulbasit Abdulsamad', detail: 'Madinah · Warsh' },
    { id: 'alhubayshi', name: 'Mansour al-Hubayshi', detail: 'Medina · Qaloon' },
  ];

  selectedScriptMode = this.scriptModes[0];
  selectedFontStyle = this.fontStyles[0];
  selectedReciter = this.reciters[0];
  activePreviewTab: 'arabic' | 'english' | 'more' = 'arabic';
  englishFontSize = 22;

  constructor() {
    super();
    this.loadFontSize();
    this.loadArabicFontSize();
    this.currentUrl = this.router.url;
    this.updateHeaderContext();
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => {
      this.currentUrl = (event as NavigationEnd).urlAfterRedirects;
      this.updateHeaderContext();
    });
  }

  onFontSizeInput(event: Event) {
    const target = event.target as { value?: string } | null;
    if (!target?.value) return;
    const value = Number(target.value);
    if (!Number.isFinite(value)) return;
    this.fontSize = value;
    this.applyFontSize(value);
    this.syncArabicSizeWithText(value);
  }

  onArabicFontSizeInput(event: Event) {
    const target = event.target as { value?: string } | null;
    if (!target?.value) return;
    const value = Number(target.value);
    if (!Number.isFinite(value)) return;
    this.arabicFontSize = value;
    this.applyArabicFontSize(value);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  onHeaderSearchInput(value: string) {
    this.headerQuery = value;
    this.router.navigate([], {
      queryParams: { q: value || null },
      queryParamsHandling: 'merge',
    });
  }

  onHeaderActionClick() {
    if (this.headerActionKind === 'lesson-new') {
      this.router.navigate(['/arabic/lessons/new']);
      return;
    }
    if (this.headerActionKind === 'roots-refresh') {
      this.triggerRefresh();
      return;
    }
    if (this.headerActionKind === 'roots-new') {
      this.router.navigate(['/arabic/roots'], {
        queryParams: { new: Date.now() },
        queryParamsHandling: 'merge',
      });
      return;
    }
    if (this.headerActionKind === 'lesson-edit') {
      const id = this.currentPath.split('/arabic/lessons/')[1]?.split('/')[0];
      if (id) {
        this.router.navigate(['/arabic/lessons', id, 'edit']);
      }
      return;
    }
    if (this.headerActionKind === 'lesson-study') {
      const id = this.currentPath.split('/arabic/lessons/')[1]?.split('/')[0];
      if (id) {
        this.router.navigate(['/arabic/lessons', id, 'study']);
      }
      return;
    }
    if (this.headerActionKind === 'worldview-new') {
      this.router.navigate(['/worldview/lessons/new'], { queryParams: { mode: 'capture' } });
    }
  }

  onHeaderSecondaryClick() {
    if (this.headerSecondaryKind === 'refresh') {
      this.triggerRefresh();
    }
  }

  onHeaderTertiaryClick() {
    if (this.headerTertiaryKind === 'lesson-claude') {
      this.router.navigate(['/arabic/lessons/claude']);
    }
  }

  toggleDiscourseFilter(key: string) {
    if (this.activeDiscourseFilters.has(key)) {
      this.activeDiscourseFilters.delete(key);
    } else {
      this.activeDiscourseFilters.add(key);
    }
    const categories = Array.from(this.activeDiscourseFilters.values());
    this.router.navigate([], {
      queryParams: { categories: categories.length ? categories.join(',') : null },
      queryParamsHandling: 'merge',
    });
  }

  discourseFilterActive(key: string) {
    return this.activeDiscourseFilters.has(key);
  }

  isStudyRoute() {
    return this.currentUrl.includes('/arabic/lessons/') && this.currentUrl.includes('/study');
  }

  studyTabIsActive(tab: 'reading' | 'memory' | 'mcq' | 'passage') {
    const url = this.currentUrl;
    return url.includes(`tab=${tab}`);
  }

  private updateHeaderContext() {
    const url = this.router.parseUrl(this.currentUrl);
    const path = url.root.children['primary']?.segments.map((s) => s.path).join('/') ?? '';
    this.currentPath = `/${path}`;
    this.headerQuery = String(url.queryParams['q'] ?? '');
    this.headerTertiaryLabel = '';
    this.headerTertiaryKind = '';

    if (this.currentPath === '/arabic/lessons') {
      this.showHeaderSearch = true;
      this.headerPlaceholder = 'Search title or source';
      this.headerActionLabel = 'New';
      this.headerActionKind = 'lesson-new';
      this.headerSecondaryLabel = 'Refresh';
      this.headerSecondaryKind = 'refresh';
      this.headerTertiaryLabel = 'Claude console';
      this.headerTertiaryKind = 'lesson-claude';
      return;
    }

    if (this.currentPath === '/worldview/lessons') {
      this.showHeaderSearch = true;
      this.headerPlaceholder = 'Search title, creator, or summary';
      this.headerActionLabel = 'Log Source';
      this.headerActionKind = 'worldview-new';
      this.headerSecondaryLabel = '';
      this.headerSecondaryKind = '';
      this.showDiscourseFilters = false;
      return;
    }

    if (this.currentPath.startsWith('/arabic/lessons/') && !this.currentPath.endsWith('/edit')) {
      this.showHeaderSearch = false;
      this.headerActionLabel = 'Edit';
      this.headerActionKind = 'lesson-edit';
      this.headerSecondaryLabel = '';
      this.headerSecondaryKind = '';
      return;
    }

    if (this.currentPath.endsWith('/edit')) {
      this.showHeaderSearch = false;
      this.headerActionLabel = 'Back to Study';
      this.headerActionKind = 'lesson-study';
      this.headerSecondaryLabel = '';
      this.headerSecondaryKind = '';
      return;
    }

    if (this.currentPath === '/arabic/roots') {
      this.showHeaderSearch = true;
      this.headerPlaceholder = 'Search root or family';
      this.headerActionLabel = 'New Root';
      this.headerActionKind = 'roots-new';
      this.headerSecondaryLabel = 'Refresh';
      this.headerSecondaryKind = 'refresh';
      this.showDiscourseFilters = false;
      return;
    }

    if (this.currentPath === '/discourse/concepts') {
      this.showHeaderSearch = true;
      this.headerPlaceholder = 'Search concepts';
      this.headerActionLabel = '';
      this.headerActionKind = '';
      this.headerSecondaryLabel = '';
      this.headerSecondaryKind = '';
      this.showDiscourseFilters = true;
      const categoriesParam = String(url.queryParams['categories'] ?? '').trim();
      this.activeDiscourseFilters = new Set(
        categoriesParam ? categoriesParam.split(',').map((c) => c.trim()).filter(Boolean) : []
      );
      return;
    }

    this.showHeaderSearch = false;
    this.headerPlaceholder = 'Search';
    this.headerActionLabel = '';
    this.headerActionKind = '';
    this.headerSecondaryLabel = '';
    this.headerSecondaryKind = '';
    this.showDiscourseFilters = false;
  }

  private triggerRefresh() {
    this.router.navigate([], {
      queryParams: { refresh: Date.now() },
      queryParamsHandling: 'merge',
    });
  }

  private applyFontSize(value: number) {
    const doc = (globalThis as any)?.document as any;
    if (!doc?.documentElement) return;
    doc.documentElement.style.setProperty('--app-font-size', `${value}px`);
    try {
      (globalThis as any)?.localStorage?.setItem('app_font_size', String(value));
    } catch {
      // ignore storage errors
    }
  }

  private applyArabicFontSize(value: number) {
    const doc = (globalThis as any)?.document as any;
    if (!doc?.documentElement) return;
    doc.documentElement.style.setProperty('--app-ar-font-size', `${value}px`);
    try {
      (globalThis as any)?.localStorage?.setItem('app_ar_font_size', String(value));
    } catch {
      // ignore storage errors
    }
  }

  private loadFontSize() {
    const doc = (globalThis as any)?.document as any;
    if (!doc?.documentElement) return;
    let value = 16;
    try {
      const stored = Number((globalThis as any)?.localStorage?.getItem('app_font_size'));
      if (Number.isFinite(stored)) {
        value = stored <= 0 ? 20 : Math.min(74, Math.max(12, stored));
      }
    } catch {
      // ignore storage errors
    }
    this.fontSize = value;
    this.applyFontSize(value);
    try {
      if (value === 20) {
        (globalThis as any)?.localStorage?.setItem('app_font_size', String(value));
      }
    } catch {
      // ignore storage errors
    }
  }

  private loadArabicFontSize() {
    const doc = (globalThis as any)?.document as any;
    if (!doc?.documentElement) return;
    let value = 20;
    try {
      const stored = Number((globalThis as any)?.localStorage?.getItem('app_ar_font_size'));
      if (Number.isFinite(stored)) value = Math.min(74, Math.max(14, stored));
    } catch {
      // ignore storage errors
    }
    this.arabicFontSize = value;
    this.applyArabicFontSize(value);
  }

  get previewArabicText(): string {
    return 'الر تلك آيات الكتاب المبين';
  }

  get previewTranslationText(): string {
    return 'In the Name of Allah—the Most Compassionate, Most Merciful.';
  }

  get previewTranslationFontSize(): number {
    return this.englishFontSize;
  }

  selectScriptMode(mode: string) {
    this.selectedScriptMode = mode;
  }

  selectFontStyle(event: Event) {
    const target = event.target as { value?: string } | null;
    if (!target?.value) return;
    this.selectedFontStyle = target.value;
  }

  resetAppearance() {
    this.selectedScriptMode = this.scriptModes[0];
    this.selectedFontStyle = this.fontStyles[0];
    this.selectedReciter = this.reciters[0];
    this.loadFontSize();
    this.loadArabicFontSize();
    this.activePreviewTab = 'arabic';
    this.englishFontSize = 22;
  }

  private syncArabicSizeWithText(textSize: number) {
    const next = Math.min(74, Math.max(14, textSize + 4));
    this.arabicFontSize = next;
    this.applyArabicFontSize(next);
  }

  setPreviewTab(tab: 'arabic' | 'english' | 'more') {
    this.activePreviewTab = tab;
  }

  onEnglishFontSizeInput(event: Event) {
    const target = event.target as { value?: string } | null;
    if (!target?.value) return;
    const value = Number(target.value);
    if (!Number.isFinite(value)) return;
    this.englishFontSize = value;
  }

}
