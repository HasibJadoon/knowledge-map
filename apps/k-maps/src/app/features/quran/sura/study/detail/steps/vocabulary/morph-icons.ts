// The Lucide icon POOL (a fixed asset — the "typeface"). The icon NAME comes from data.
// Register once via provideMorphIcons() on the Word Page; the host + all dynamic block
// components + page parts inherit it through the injector hierarchy.
import { LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import {
  Dna, Ruler, GitFork, Tag, BookOpen, Landmark, Waypoints, Feather, Eye, GitCompare,
  Languages, ListOrdered, TrendingUp, Library, Grid3x3, Sparkles, Orbit,
  Sunrise, Star, Scale, Split, LayoutGrid, KeyRound, Link, Circle, MapPin, Quote,
} from 'lucide-angular';

export const MORPH_LUCIDE = {
  Dna, Ruler, GitFork, Tag, BookOpen, Landmark, Waypoints, Feather, Eye, GitCompare,
  Languages, ListOrdered, TrendingUp, Library, Grid3x3, Sparkles, Orbit,
  Sunrise, Star, Scale, Split, LayoutGrid, KeyRound, Link, Circle, MapPin, Quote,
};

export function provideMorphIcons() {
  return { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(MORPH_LUCIDE) };
}

// Icon names arrive from D1 data; an unknown name makes lucide-angular THROW mid-render,
// which kills the whole word page (blocks after it never paint, scroll dies). Every
// data-driven <lucide-icon [name]> must go through this guard.
const MORPH_ICON_KEYS = new Set(Object.keys(MORPH_LUCIDE).map(k => k.toLowerCase()));

/** Clamp a data-supplied icon name to the pool; fall back instead of throwing. */
export function safeMorphIcon(name: string | null | undefined, fallback = 'circle'): string {
  const key = String(name ?? '').replace(/[-_\s]/g, '').toLowerCase();
  return key && MORPH_ICON_KEYS.has(key) ? String(name) : fallback;
}
