// Closed layer registry — the layer vocabulary is fixed, so this map is a known set.
// `block.type` selects the component exactly as `block.icon` selects the glyph.
// Heavy SVG/ceremonial layers are lazy `() => import()`; the rest are eager.
import { Type } from '@angular/core';
import { MorphBlockBody } from './morph-block.types';

import { RootDnaBlock } from './blocks/root-dna.block';
import { SarfBlock } from './blocks/sarf.block';
import { DerivationsBlock } from './blocks/derivations.block';
import { IrabBlock } from './blocks/irab.block';
import { LexiconBlock } from './blocks/lexicon.block';
import { BalaghaBlock } from './blocks/balagha.block';
import { MetaphorBlock } from './blocks/metaphor.block';
import { KindredBlock } from './blocks/kindred.block';
import { TranslatorsBlock } from './blocks/translators.block';
import { OccurrencesBlock } from './blocks/occurrences.block';
import { DevelopmentBlock } from './blocks/development.block';
import { TafsirBlock } from './blocks/tafsir.block';
import { AttestationsBlock } from './blocks/attestations.block';

export type RegistryEntry =
  | { cmp: Type<MorphBlockBody> }
  | { load: () => Promise<Type<MorphBlockBody>> };

export const MORPH_BLOCK_REGISTRY: Record<string, RegistryEntry> = {
  root_dna:     { cmp: RootDnaBlock },
  sarf:         { cmp: SarfBlock },
  derivations:  { cmp: DerivationsBlock },
  irab:         { cmp: IrabBlock },
  lexicon:      { cmp: LexiconBlock },
  balagha:      { cmp: BalaghaBlock },
  metaphor:     { cmp: MetaphorBlock },
  kindred:      { cmp: KindredBlock },
  translators:  { cmp: TranslatorsBlock },
  occurrences:  { cmp: OccurrencesBlock },
  development:  { cmp: DevelopmentBlock },
  tafsir:       { cmp: TafsirBlock },
  attestations: { cmp: AttestationsBlock },
  // heavy → lazy-loaded on demand
  synthesis:     { load: () => import('./blocks/synthesis.block').then(m => m.SynthesisBlock) },
  constellation: { load: () => import('./blocks/constellation.block').then(m => m.ConstellationBlock) },
  usage_map:     { load: () => import('./blocks/usage-map.block').then(m => m.UsageMapBlock) },
  master_story:  { load: () => import('./blocks/master-story.block').then(m => m.MasterStoryBlock) },
};
