# Fused Word Lens

Data-driven word view: **Membean's multi-panel pedagogy** rendered in the
**k-maps illuminated (gold-on-black)** aesthetic. Replaces a hard-coded mockup —
every panel binds to a `FusedWordVM`, hidden when its data is absent.

## Pieces
- `fused-word.models.ts` — `FusedWordVM` (each field names its source table).
- `fused-word-lens.component.ts` — `<app-fused-word-lens [wordVm]="vm">` — presentational only.
- `fused-word.facade.ts` — `FusedWordFacade.load(word, opts)` → `Observable<FusedWordVM>`.
- `word-extras.service.ts` — the panels outside Five-Lens (verb gov, antonyms, idioms, tafsīr).

## Usage
```ts
const word: QuranWord = { surah: 39, ayah: 3, wordIndex: 16, text: 'زُلْفَىٰ', root: 'زلف' };
this.facade.load(word, { pos: 'اسم · Noun', level: 'Level 1 · الزُّمَر' })
  .subscribe(vm => this.vm = vm);
```
```html
<app-fused-word-lens [wordVm]="vm" (next)="advance()" (iKnow)="markKnown($event)"></app-fused-word-lens>
```

## Field → table contract
| VM field | Source | Worker |
|---|---|---|
| lemma/translit/sense/pattern, senses, ṣarf, hook, constellation, lexica, occurrences, āyah | `ar_ling_lexicon_root_entries` + `ar_ling_lexicon_blocks` + `ar_ling_lemmas` | `FiveLensLexiconService` (existing) |
| examples | `qr_word_occurrences` + `qr_translations` | `QrWordStudyService` (existing) |
| **verbGovernment** | `ar_ling_verb_government` | `GET al/verb-government/:root` *(to add)* |
| **antonyms** | `ar_ling_root_antonyms` | `GET al/root-antonyms/:root` *(to add)* |
| **idioms** | `ar_ling_expressions` | `GET al/expressions/:root` *(to add)* |
| **tafsir** | `qr_tafsir_entries` | `GET qr/tafsir/:surah/:ayah` *(to add)* |
| sinai | `ar_ling_root_scholarship` (src_sinai_2023_keyterms) | pending ingestion |

The four `*(to add)*` endpoints should return JSON already shaped to the VM row
interfaces (`VgRow`, `AntonymRow`, `IdiomRow`, `TafsirRow`). Until deployed,
`WordExtrasService` degrades to `[]` and those panels hide — the rest renders
live from the existing Five-Lens + QR services.
