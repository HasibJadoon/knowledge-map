# Qur’an Token Backbone

A **simple, stable data model** for studying the Qur’an by passage, word, phrase, and concept — built for long-term learning, reuse, and spaced repetition.

This document explains **what exists**, **why it exists**, and **how it works**, with **two concrete examples**.

---

## Architecture Overview

![SentenceTokens architecture](https://assests.k-maps.com/wiki/sentence-tokens-sm.png)

The diagram above is the core architecture for Sentence Tokens and shows how sentences, tokens, spans, and concepts interconnect through the lexicon and grammar layers; treat it as the primary visual reference for the text model described below.

## What Problem This Solves

Most Qur’an apps mix text, explanations, and lessons together.
That breaks long-term learning.

This system separates:
- **Text** (never changes)
- **Analysis** (grows over time)
- **Study views** (generated, not stored)

Result:
> Store Qur’an once → study it forever in different ways.

---

## The 6 Core Tables 

### 1. `quran_sentences`
Stores one study sentence (ayah or clause).

Purpose:
- Anchor for study
- Everything links to this

---

### 2. `quran_tokens`
Stores **each word** in a sentence, in order.

Purpose:
- Clickable words
- Search by lemma/root
- Vocabulary extraction

---

### 3. `token_lexicon_links`
Links a **word occurrence** to a **lexicon entry**.

Purpose:
- One word → one meaning (or several with confidence)
- Reuse vocab knowledge across the Qur’an

---

### 4. `token_spans`
Marks **groups of words** (phrases).

Purpose:
- Idioms
- Grammar constructions
- Multi-word meanings

---

### 5. `idioms` + `idiom_instances`

- `idioms` = the idea (global)
- `idiom_instances` = where it appears

Purpose:
- One idiom, many verses
- Meaning stored once, reused everywhere

---

### 6. `grammar_instances`
Applies a grammar concept to a phrase span.

Purpose:
- Grammar is concept-based
- Examples are verse-based

---

## Example 1: Vocabulary (Single Word)

Verse fragment:
> **وشروه بثمن بخس** (12:20)

Process:
1. Sentence stored in `quran_sentences`
2. Word **وشروه** stored as a token
3. Token linked to lexicon entry **ش ر ي** via `token_lexicon_links`

Result:
- The meaning of **شَرَى** is learned once
- Every future occurrence benefits from it
- Spaced repetition targets the *lexicon entry*, not one verse

---

## Example 2: Idiom (Multiple Words)

Verse fragment:
> **فصبر جميل** (12:18)

Process:
1. Tokens: فـ | صبر | جميل
2. Span created covering tokens 1–2
3. Idiom created: "صبر جميل"
4. Instance linked via `idiom_instances`

Result:
- Idiom meaning stored once
- Exact phrase highlighted in UI
- Same idiom reused in tafsir, lessons, and SRS

---

## How Passage Study Works

1. Choose a passage (e.g. Yusuf 12:19–29)
2. Insert sentences + tokens once
3. During study:
   - link words to lexicon
   - mark idioms
   - tag grammar spans
4. App generates automatically:
   - vocab list
   - idioms list
   - grammar notes
   - reading view

No lesson duplication. No re-writing.

---

## Why This Scales Long-Term

- Qur’an text stays untouched
- Knowledge grows independently
- Lessons are **queries**, not files
- Easy to generate wiki pages, lessons, or flashcards

This is the backbone. Everything else is UI.
