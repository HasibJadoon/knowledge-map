import {
  Component,
  AfterViewInit,
  ElementRef,
  ViewChild,
  inject,
  signal,
  computed,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import gsap from 'gsap';

export interface Surah {
  id: number;
  name: string;
  arabicName: string;
  ayahs: number;
  type: 'Makki' | 'Madani';
  juz: number;
}

@Component({
  selector: 'km-quran-landing',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './quran-landing.component.html',
  styleUrl: './quran-landing.component.scss',
})
export class QuranLandingComponent implements AfterViewInit {
  private router = inject(Router);

  @ViewChild('cardsContainer') cardsContainer!: ElementRef<HTMLElement>;

  searchQuery = signal('');
  typeFilter = signal<'all' | 'Makki' | 'Madani'>('all');
  viewMode = signal<'grid' | 'list'>('grid');

  readonly surahs: Surah[] = [
    { id: 1, name: 'Al-Fatihah', arabicName: 'الفاتحة', ayahs: 7, type: 'Makki', juz: 1 },
    { id: 2, name: 'Al-Baqarah', arabicName: 'البقرة', ayahs: 286, type: 'Madani', juz: 1 },
    { id: 3, name: "Ali 'Imran", arabicName: 'آل عمران', ayahs: 200, type: 'Madani', juz: 3 },
    { id: 4, name: 'An-Nisa', arabicName: 'النساء', ayahs: 176, type: 'Madani', juz: 4 },
    { id: 5, name: "Al-Ma'idah", arabicName: 'المائدة', ayahs: 120, type: 'Madani', juz: 6 },
    { id: 6, name: "Al-An'am", arabicName: 'الأنعام', ayahs: 165, type: 'Makki', juz: 7 },
    { id: 7, name: "Al-A'raf", arabicName: 'الأعراف', ayahs: 206, type: 'Makki', juz: 8 },
    { id: 8, name: 'Al-Anfal', arabicName: 'الأنفال', ayahs: 75, type: 'Madani', juz: 9 },
    { id: 9, name: 'At-Tawbah', arabicName: 'التوبة', ayahs: 129, type: 'Madani', juz: 10 },
    { id: 10, name: 'Yunus', arabicName: 'يونس', ayahs: 109, type: 'Makki', juz: 11 },
    { id: 11, name: 'Hud', arabicName: 'هود', ayahs: 123, type: 'Makki', juz: 11 },
    { id: 12, name: 'Yusuf', arabicName: 'يوسف', ayahs: 111, type: 'Makki', juz: 12 },
    { id: 13, name: "Ar-Ra'd", arabicName: 'الرعد', ayahs: 43, type: 'Madani', juz: 13 },
    { id: 14, name: 'Ibrahim', arabicName: 'ابراهيم', ayahs: 52, type: 'Makki', juz: 13 },
    { id: 15, name: 'Al-Hijr', arabicName: 'الحجر', ayahs: 99, type: 'Makki', juz: 14 },
    { id: 16, name: 'An-Nahl', arabicName: 'النحل', ayahs: 128, type: 'Makki', juz: 14 },
    { id: 17, name: 'Al-Isra', arabicName: 'الإسراء', ayahs: 111, type: 'Makki', juz: 15 },
    { id: 18, name: 'Al-Kahf', arabicName: 'الكهف', ayahs: 110, type: 'Makki', juz: 15 },
    { id: 19, name: 'Maryam', arabicName: 'مريم', ayahs: 98, type: 'Makki', juz: 16 },
    { id: 20, name: 'Ta-Ha', arabicName: 'طه', ayahs: 135, type: 'Makki', juz: 16 },
    { id: 21, name: 'Al-Anbiya', arabicName: 'الأنبياء', ayahs: 112, type: 'Makki', juz: 17 },
    { id: 22, name: 'Al-Hajj', arabicName: 'الحج', ayahs: 78, type: 'Madani', juz: 17 },
    { id: 23, name: "Al-Mu'minun", arabicName: 'المؤمنون', ayahs: 118, type: 'Makki', juz: 18 },
    { id: 24, name: 'An-Nur', arabicName: 'النور', ayahs: 64, type: 'Madani', juz: 18 },
    { id: 25, name: 'Al-Furqan', arabicName: 'الفرقان', ayahs: 77, type: 'Makki', juz: 18 },
    { id: 26, name: "Ash-Shu'ara", arabicName: 'الشعراء', ayahs: 227, type: 'Makki', juz: 19 },
    { id: 27, name: 'An-Naml', arabicName: 'النمل', ayahs: 93, type: 'Makki', juz: 19 },
    { id: 28, name: 'Al-Qasas', arabicName: 'القصص', ayahs: 88, type: 'Makki', juz: 20 },
    { id: 29, name: 'Al-Ankabut', arabicName: 'العنكبوت', ayahs: 69, type: 'Makki', juz: 20 },
    { id: 30, name: 'Ar-Rum', arabicName: 'الروم', ayahs: 60, type: 'Makki', juz: 21 },
    { id: 31, name: 'Luqman', arabicName: 'لقمان', ayahs: 34, type: 'Makki', juz: 21 },
    { id: 32, name: 'As-Sajdah', arabicName: 'السجدة', ayahs: 30, type: 'Makki', juz: 21 },
    { id: 33, name: 'Al-Ahzab', arabicName: 'الأحزاب', ayahs: 73, type: 'Madani', juz: 21 },
    { id: 34, name: 'Saba', arabicName: 'سبأ', ayahs: 54, type: 'Makki', juz: 22 },
    { id: 35, name: 'Fatir', arabicName: 'فاطر', ayahs: 45, type: 'Makki', juz: 22 },
    { id: 36, name: 'Ya-Sin', arabicName: 'يس', ayahs: 83, type: 'Makki', juz: 22 },
    { id: 37, name: 'As-Saffat', arabicName: 'الصافات', ayahs: 182, type: 'Makki', juz: 23 },
    { id: 38, name: 'Sad', arabicName: 'ص', ayahs: 88, type: 'Makki', juz: 23 },
    { id: 39, name: 'Az-Zumar', arabicName: 'الزمر', ayahs: 75, type: 'Makki', juz: 23 },
    { id: 40, name: 'Ghafir', arabicName: 'غافر', ayahs: 85, type: 'Makki', juz: 24 },
    { id: 41, name: 'Fussilat', arabicName: 'فصلت', ayahs: 54, type: 'Makki', juz: 24 },
    { id: 42, name: 'Ash-Shura', arabicName: 'الشورى', ayahs: 53, type: 'Makki', juz: 25 },
    { id: 43, name: 'Az-Zukhruf', arabicName: 'الزخرف', ayahs: 89, type: 'Makki', juz: 25 },
    { id: 44, name: 'Ad-Dukhan', arabicName: 'الدخان', ayahs: 59, type: 'Makki', juz: 25 },
    { id: 45, name: 'Al-Jathiyah', arabicName: 'الجاثية', ayahs: 37, type: 'Makki', juz: 25 },
    { id: 46, name: 'Al-Ahqaf', arabicName: 'الأحقاف', ayahs: 35, type: 'Makki', juz: 26 },
    { id: 47, name: 'Muhammad', arabicName: 'محمد', ayahs: 38, type: 'Madani', juz: 26 },
    { id: 48, name: 'Al-Fath', arabicName: 'الفتح', ayahs: 29, type: 'Madani', juz: 26 },
    { id: 49, name: 'Al-Hujurat', arabicName: 'الحجرات', ayahs: 18, type: 'Madani', juz: 26 },
    { id: 50, name: 'Qaf', arabicName: 'ق', ayahs: 45, type: 'Makki', juz: 26 },
    { id: 51, name: 'Adh-Dhariyat', arabicName: 'الذاريات', ayahs: 60, type: 'Makki', juz: 26 },
    { id: 52, name: 'At-Tur', arabicName: 'الطور', ayahs: 49, type: 'Makki', juz: 27 },
    { id: 53, name: 'An-Najm', arabicName: 'النجم', ayahs: 62, type: 'Makki', juz: 27 },
    { id: 54, name: 'Al-Qamar', arabicName: 'القمر', ayahs: 55, type: 'Makki', juz: 27 },
    { id: 55, name: 'Ar-Rahman', arabicName: 'الرحمن', ayahs: 78, type: 'Madani', juz: 27 },
    { id: 56, name: "Al-Waqi'ah", arabicName: 'الواقعة', ayahs: 96, type: 'Makki', juz: 27 },
    { id: 57, name: 'Al-Hadid', arabicName: 'الحديد', ayahs: 29, type: 'Madani', juz: 27 },
    { id: 58, name: 'Al-Mujadila', arabicName: 'المجادلة', ayahs: 22, type: 'Madani', juz: 28 },
    { id: 59, name: 'Al-Hashr', arabicName: 'الحشر', ayahs: 24, type: 'Madani', juz: 28 },
    { id: 60, name: 'Al-Mumtahanah', arabicName: 'الممتحنة', ayahs: 13, type: 'Madani', juz: 28 },
    { id: 61, name: 'As-Saf', arabicName: 'الصف', ayahs: 14, type: 'Madani', juz: 28 },
    { id: 62, name: "Al-Jumu'ah", arabicName: 'الجمعة', ayahs: 11, type: 'Madani', juz: 28 },
    { id: 63, name: 'Al-Munafiqun', arabicName: 'المنافقون', ayahs: 11, type: 'Madani', juz: 28 },
    { id: 64, name: 'At-Taghabun', arabicName: 'التغابن', ayahs: 18, type: 'Madani', juz: 28 },
    { id: 65, name: 'At-Talaq', arabicName: 'الطلاق', ayahs: 12, type: 'Madani', juz: 28 },
    { id: 66, name: 'At-Tahrim', arabicName: 'التحريم', ayahs: 12, type: 'Madani', juz: 28 },
    { id: 67, name: 'Al-Mulk', arabicName: 'الملك', ayahs: 30, type: 'Makki', juz: 29 },
    { id: 68, name: 'Al-Qalam', arabicName: 'القلم', ayahs: 52, type: 'Makki', juz: 29 },
    { id: 69, name: 'Al-Haqqah', arabicName: 'الحاقة', ayahs: 52, type: 'Makki', juz: 29 },
    { id: 70, name: "Al-Ma'arij", arabicName: 'المعارج', ayahs: 44, type: 'Makki', juz: 29 },
    { id: 71, name: 'Nuh', arabicName: 'نوح', ayahs: 28, type: 'Makki', juz: 29 },
    { id: 72, name: 'Al-Jinn', arabicName: 'الجن', ayahs: 28, type: 'Makki', juz: 29 },
    { id: 73, name: 'Al-Muzzammil', arabicName: 'المزمل', ayahs: 20, type: 'Makki', juz: 29 },
    { id: 74, name: 'Al-Muddaththir', arabicName: 'المدثر', ayahs: 56, type: 'Makki', juz: 29 },
    { id: 75, name: 'Al-Qiyamah', arabicName: 'القيامة', ayahs: 40, type: 'Makki', juz: 29 },
    { id: 76, name: 'Al-Insan', arabicName: 'الإنسان', ayahs: 31, type: 'Madani', juz: 29 },
    { id: 77, name: 'Al-Mursalat', arabicName: 'المرسلات', ayahs: 50, type: 'Makki', juz: 29 },
    { id: 78, name: "An-Naba'", arabicName: 'النبأ', ayahs: 40, type: 'Makki', juz: 30 },
    { id: 79, name: "An-Nazi'at", arabicName: 'النازعات', ayahs: 46, type: 'Makki', juz: 30 },
    { id: 80, name: 'Abasa', arabicName: 'عبس', ayahs: 42, type: 'Makki', juz: 30 },
    { id: 81, name: 'At-Takwir', arabicName: 'التكوير', ayahs: 29, type: 'Makki', juz: 30 },
    { id: 82, name: 'Al-Infitar', arabicName: 'الانفطار', ayahs: 19, type: 'Makki', juz: 30 },
    { id: 83, name: 'Al-Mutaffifin', arabicName: 'المطففين', ayahs: 36, type: 'Makki', juz: 30 },
    { id: 84, name: 'Al-Inshiqaq', arabicName: 'الانشقاق', ayahs: 25, type: 'Makki', juz: 30 },
    { id: 85, name: 'Al-Buruj', arabicName: 'البروج', ayahs: 22, type: 'Makki', juz: 30 },
    { id: 86, name: 'At-Tariq', arabicName: 'الطارق', ayahs: 17, type: 'Makki', juz: 30 },
    { id: 87, name: "Al-A'la", arabicName: 'الأعلى', ayahs: 19, type: 'Makki', juz: 30 },
    { id: 88, name: 'Al-Ghashiyah', arabicName: 'الغاشية', ayahs: 26, type: 'Makki', juz: 30 },
    { id: 89, name: 'Al-Fajr', arabicName: 'الفجر', ayahs: 30, type: 'Makki', juz: 30 },
    { id: 90, name: 'Al-Balad', arabicName: 'البلد', ayahs: 20, type: 'Makki', juz: 30 },
    { id: 91, name: 'Ash-Shams', arabicName: 'الشمس', ayahs: 15, type: 'Makki', juz: 30 },
    { id: 92, name: 'Al-Layl', arabicName: 'الليل', ayahs: 21, type: 'Makki', juz: 30 },
    { id: 93, name: 'Ad-Duha', arabicName: 'الضحى', ayahs: 11, type: 'Makki', juz: 30 },
    { id: 94, name: 'Ash-Sharh', arabicName: 'الشرح', ayahs: 8, type: 'Makki', juz: 30 },
    { id: 95, name: 'At-Tin', arabicName: 'التين', ayahs: 8, type: 'Makki', juz: 30 },
    { id: 96, name: 'Al-Alaq', arabicName: 'العلق', ayahs: 19, type: 'Makki', juz: 30 },
    { id: 97, name: 'Al-Qadr', arabicName: 'القدر', ayahs: 5, type: 'Makki', juz: 30 },
    { id: 98, name: 'Al-Bayyinah', arabicName: 'البينة', ayahs: 8, type: 'Madani', juz: 30 },
    { id: 99, name: 'Az-Zalzalah', arabicName: 'الزلزلة', ayahs: 8, type: 'Madani', juz: 30 },
    { id: 100, name: 'Al-Adiyat', arabicName: 'العاديات', ayahs: 11, type: 'Makki', juz: 30 },
    { id: 101, name: "Al-Qari'ah", arabicName: 'القارعة', ayahs: 11, type: 'Makki', juz: 30 },
    { id: 102, name: 'At-Takathur', arabicName: 'التكاثر', ayahs: 8, type: 'Makki', juz: 30 },
    { id: 103, name: 'Al-Asr', arabicName: 'العصر', ayahs: 3, type: 'Makki', juz: 30 },
    { id: 104, name: 'Al-Humazah', arabicName: 'الهمزة', ayahs: 9, type: 'Makki', juz: 30 },
    { id: 105, name: 'Al-Fil', arabicName: 'الفيل', ayahs: 5, type: 'Makki', juz: 30 },
    { id: 106, name: 'Quraysh', arabicName: 'قريش', ayahs: 4, type: 'Makki', juz: 30 },
    { id: 107, name: "Al-Ma'un", arabicName: 'الماعون', ayahs: 7, type: 'Makki', juz: 30 },
    { id: 108, name: 'Al-Kawthar', arabicName: 'الكوثر', ayahs: 3, type: 'Makki', juz: 30 },
    { id: 109, name: 'Al-Kafirun', arabicName: 'الكافرون', ayahs: 6, type: 'Makki', juz: 30 },
    { id: 110, name: 'An-Nasr', arabicName: 'النصر', ayahs: 3, type: 'Madani', juz: 30 },
    { id: 111, name: 'Al-Masad', arabicName: 'المسد', ayahs: 5, type: 'Makki', juz: 30 },
    { id: 112, name: 'Al-Ikhlas', arabicName: 'الإخلاص', ayahs: 4, type: 'Makki', juz: 30 },
    { id: 113, name: 'Al-Falaq', arabicName: 'الفلق', ayahs: 5, type: 'Makki', juz: 30 },
    { id: 114, name: 'An-Nas', arabicName: 'الناس', ayahs: 6, type: 'Makki', juz: 30 },
  ];

  filteredSurahs = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const t = this.typeFilter();
    return this.surahs.filter((s) => {
      const matchesSearch =
        !q || s.name.toLowerCase().includes(q) || s.arabicName.includes(q);
      const matchesType = t === 'all' || s.type === t;
      return matchesSearch && matchesType;
    });
  });

  ngAfterViewInit(): void {
    this.animateCards();
  }

  animateCards(): void {
    const cards = this.cardsContainer?.nativeElement?.querySelectorAll(
      '.surah-card, .surah-row'
    );
    if (cards && cards.length) {
      gsap.fromTo(
        cards,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.025, ease: 'power2.out' }
      );
    }
  }

  setSearch(value: string): void {
    this.searchQuery.set(value);
  }

  setTypeFilter(value: 'all' | 'Makki' | 'Madani'): void {
    this.typeFilter.set(value);
  }

  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode.set(mode);
  }

  navigateToSurah(id: number): void {
    this.router.navigate(['/arabic/quran', id]);
  }

  back(): void {
    this.router.navigate(['/arabic']);
  }
}
