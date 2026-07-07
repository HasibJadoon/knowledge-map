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
