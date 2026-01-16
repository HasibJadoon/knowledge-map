import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class SettingsPage implements OnInit {
  fontSheetOpen = false;
  activeFontTarget: "arabic" | "english" = "arabic";
  arabicFontSize = 32;
  englishFontSize = 18;
  selectedArabicFont = "uthmanic";
  selectedEnglishFont = "poppins";
  readonly arabicFonts = [
    { id: "uthmanic", label: "Uthmani/Madani", stack: ["Uthmanic Hafs", "Scheherazade New", "serif"] },
    { id: "system", label: "System Arabic", stack: ["Geeza Pro", "Arial", "serif"] },
  ];

  readonly englishFonts = [
    { id: "poppins", label: "Poppins", stack: ["Poppins", "Helvetica Neue", "Arial", "sans-serif"] },
    { id: "system", label: "System", stack: ["-apple-system", "Helvetica Neue", "Arial", "sans-serif"] },
  ];



  ngOnInit(): void {
    const savedArabicSize = Number(localStorage.getItem('arabicFontSize'));
    if (!Number.isNaN(savedArabicSize) && savedArabicSize > 0) {
      this.arabicFontSize = savedArabicSize;
    }

    const savedEnglishSize = Number(localStorage.getItem('englishFontSize'));
    if (!Number.isNaN(savedEnglishSize) && savedEnglishSize > 0) {
      this.englishFontSize = savedEnglishSize;
    }

    const savedArabicFont = localStorage.getItem('arabicFont');
    if (savedArabicFont) {
      this.selectedArabicFont = savedArabicFont;
    }

    const savedEnglishFont = localStorage.getItem('englishFont');
    if (savedEnglishFont) {
      this.selectedEnglishFont = savedEnglishFont;
    }

    this.applyFontSettings();
  }

  onArabicFontSizeChange(value: number | { lower: number; upper: number }): void {
    const next = typeof value === 'number' ? value : value.lower;
    this.arabicFontSize = next;
    localStorage.setItem('arabicFontSize', String(next));
    this.applyFontSettings();
  }

  onEnglishFontSizeChange(value: number | { lower: number; upper: number }): void {
    const next = typeof value === 'number' ? value : value.lower;
    this.englishFontSize = next;
    localStorage.setItem('englishFontSize', String(next));
    this.applyFontSettings();
  }

  onArabicFontChange(value: string): void {
    this.selectedArabicFont = value;
    localStorage.setItem('arabicFont', value);
    this.applyFontSettings();
  }

  onEnglishFontChange(value: string): void {
    this.selectedEnglishFont = value;
    localStorage.setItem('englishFont', value);
    this.applyFontSettings();
  }


  getSelectedArabicLabel(): string {
    return this.arabicFonts.find(font => font.id === this.selectedArabicFont)?.label ?? 'Arabic';
  }

  getSelectedEnglishLabel(): string {
    return this.englishFonts.find(font => font.id === this.selectedEnglishFont)?.label ?? 'English';
  }

  getFontPreview(font: { id: string; label: string; stack: string[] }): string {
    return font.id === 'system' ? 'System default' : font.stack[0];
  }

  getSelectedArabicStack(): string {
    const font = this.arabicFonts.find(item => item.id == this.selectedArabicFont) ?? this.arabicFonts[0];
    return font.stack.join(', ');
  }

  getSelectedEnglishStack(): string {
    const font = this.englishFonts.find(item => item.id == this.selectedEnglishFont) ?? this.englishFonts[0];
    return font.stack.join(', ');
  }

  private applyFontSettings(): void {
    const arabic = this.arabicFonts.find(font => font.id === this.selectedArabicFont) ?? this.arabicFonts[0];
    const english = this.englishFonts.find(font => font.id === this.selectedEnglishFont) ?? this.englishFonts[0];

    document.documentElement.style.setProperty('--app-font-ar', arabic.stack.join(', '));
    document.documentElement.style.setProperty('--app-font-sans', english.stack.join(', '));
    document.documentElement.style.setProperty('--app-font-ar-size', `${this.arabicFontSize}px`);
    document.documentElement.style.setProperty('--app-font-size', `${this.englishFontSize}px`);
  }

  openFontSheet(target: "arabic" | "english"): void {
    this.activeFontTarget = target;
    this.fontSheetOpen = true;
  }

  closeFontSheet(): void {
    this.fontSheetOpen = false;
  }
}
