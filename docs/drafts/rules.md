# Canonical Vocabulary & Structure Rules

## Core Law (One Line)

**Roots define origin, tokens define words, lexicon defines meaning.**

---

## Vocabulary JSON Placement — Canonical Rule

### 1. `ar_u_roots`
- ❌ NO vocabulary meanings
- ❌ NO cards
- ✔ Root identity only

### 2. `ar_u_tokens`
- ✔ Basic vocabulary (lemma-level)
- ✔ One simple meaning set
- ✔ Optional basic card

### 3. `ar_u_lexicon`
- ✔ Full meaning ranges
- ✔ Sense distinctions
- ✔ Qur’anic / contextual nuance
- ✔ Proper vocabulary cards

---

## Card Rule (Minimal)

- **Front** → unique occurrence (lemma + reference)
- **Back** → range of meanings

---

## Structural Law (One Line)

**Identity is universal, location is occurrence, presentation is container.**

---

# Roots — Minimal Rules

## DOs
- Build bottom-up  
  `Universal → Occurrence → Container / Lesson`
- Use SHA **only** for universal IDs  
  (from `canonical_input` only)
- Keep roots pure  
  Identity only, no meanings
- Place vocabulary on tokens / lexicon  
  Not on roots
- Normalize text only for search  
  Store normalized fields separately
- Reuse universals everywhere  
  One root / token / span forever
- Use spans for grouping, sentences for predication

## DON’Ts
- ❌ No meanings in `ar_u_roots`
- ❌ No hashing normalized/search text
- ❌ No universals created from occurrences
- ❌ No container logic mixed with semantics
- ❌ No duplication of tokens, spans, sentences
- ❌ No verb+prep treated as noun span
- ❌ No analysis before structure exists

---

# Phrase / Span — Minimal Type IDs

All phrases are **dependent** and live **inside a sentence**.

- `IDAFI` — إضافة  
  مثال: أحسن القصص
- `WASFI` — موصوف + صفة  
  مثال: الكتاب المبين
- `JAR_MAJRUR` — جار + مجرور  
  مثال: في يوسف
- `ISHARA` — إشارة + مشار إليه  
  مثال: تلك آيات
- `COMPLEX` — عبارة مركبة  
  مثال: بما أوحينا إليك

### Law
**Phrases depend; sentences decide.**

---

# Arabic Valency — Minimal

- Valency = verb requirement
- Lives in `ar_u_valency`
- Links **verb ⇄ preposition**

## Types
- `REQ_PREP`
- `OPT_PREP`
- `NO_PREP`

## Rules
- Not a span
- Not a sentence
- No meaning

### Law
**Valency tells what a verb needs.**

---

# Meaning — Minimal Rules

## Where Meaning Lives
- ✔ Lexicon
- ❌ Roots
- ❌ Occurrences

## Placement
- `ar_u_roots` → ❌ no meaning
- `ar_u_tokens` → ✔ basic meaning (optional)
- `ar_u_lexicon` → ✔ full meaning range
- Occurrences → ❌ no meaning

## Rules
- Meaning is universal
- Meaning is reusable
- Meaning is never location-based
- Meaning is selected, not created

## DON’Ts
- ❌ No meaning on roots
- ❌ No meaning in sentences
- ❌ No meaning in occurrences
- ❌ No hashing meaning text

### Law
**Roots name, tokens label, lexicon means.**

---

# Occurrence — Minimal Rules

## What an Occurrence Is
- A location record
- Links a universal entity to a place

## What Can Occur
- Token
- Phrase
- Sentence
- Valency usage

## Rules
- Occurrence answers **WHERE**, not **WHAT**
- Never creates universals
- Never changes meaning
- One occurrence = one location
- No hashing

## DON’Ts
- ❌ No semantics
- ❌ No analysis
- ❌ No identity logic
- ❌ No reuse as universal

### Law
**Universals are reused; occurrences are placed.**

---

# Sentence — Minimal Rules

## What a Sentence Is
- The first asserting unit
- Carries meaning, negation, condition

## Sentence Types
- `SIMPLE`  
  One predication
- `COMPLEX`  
  One predication with dependent phrase or clause

## What a Sentence Contains
- Ordered tokens
- Optional phrases
- Optional valency usage

## Rules
- Sentence asserts once
- May contain phrases
- Not recursive
- No sentence inside sentence

## DON’Ts
- ❌ No meanings stored
- ❌ No grammar objects created
- ❌ No identity hashing from text

### Law
**Sentence asserts; nothing below it does.**

---

# After Sentence — Minimal Rules

## What Comes After
- Meaning selection (lexicon)
- Grammar notes
- Valency confirmation
- Annotations / reflections

## Rules
- Attach only to sentence occurrence
- Select meaning, do not create
- Explain grammar, do not restructure
- All optional

## DON’Ts
- ❌ No new universals
- ❌ No sentence splitting
- ❌ No recursion
- ❌ No re-hashing

### Law
**After sentence, we explain — we don’t rebuild.**

---

# Indexing & Search — Minimal Rules

## Purpose
- Make content findable
- Never redefine structure

## Indexed
- Roots (`root_norm`)
- Tokens (`lemma_norm`)
- Sentences (text cache)
- Containers (titles only)

## Rules
- Normalized fields only
- Index ≠ identity
- Search never creates meaning
- Search never alters structure

## DON’Ts
- ❌ No hashing search text
- ❌ No semantics in index
- ❌ No structure from search
- ❌ No lesson logic in search

### Law
**Search finds; structure defines.**

---

# Container Layer — Minimal Rules

## What a Container Is
- A source host
- Raw content only
- No analysis, no meaning

## Container Types
- `QURAN`
- `BOOK`
- `DOCUMENT`
- `MEDIA`

## What Containers Contain
- Raw text or media reference
- Structural ordering (ayah, page, timecode)
- Basic metadata

## What Containers Never Contain
- Roots
- Tokens
- Sentences
- Expressions
- Meanings
- Grammar
- Lessons
- Worldview

## Rules
- Containers are read-only
- Containers never change due to analysis
- Containers depend on nothing

## Order
**Container → Analysis → Lesson → Worldview**

### Law
**Containers expose text; knowledge lives elsewhere.**

---

# Expressions — Minimal Rules

## What an Expression Is
- Fixed or semi-fixed multi-token unit
- Reused across texts
- Identified after sentence, before worldview

## Where It Lives
- Universal: `ar_u_expressions`
- Occurrence: `ar_occ_expression`

## Examples
- بما أوحينا إليك
- لا ريب فيه
- أهل الكتاب

## Rules
- Grouping + reuse
- May include verbs
- Does not assert
- Depends on sentence occurrence
- May overlap tokens

## DON’Ts
- ❌ Not a sentence
- ❌ Not grammar
- ❌ Not meaning creation
- ❌ Not worldview

---

# Expression ↔ Lexicon — Minimal Rules

## Relationship
- Expression does not own meaning
- Lexicon provides meaning
- Expression selects meaning

## Rules
- Expression may override token meaning
- Meaning remains universal
- No meaning stored on expression
- Selection is contextual

## DON’Ts
- ❌ No meanings embedded
- ❌ No grammar
- ❌ No worldview

### Law
**Lexicon means; expression selects.**