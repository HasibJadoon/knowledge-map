// Parses Arabic research-tab prose into segments so inline Quran references
// (`Q.2:30`, `Q. 3-7`) can be rendered as tappable Mushaf-bracket chips and
// parenthesized footnote markers (`(72)`) become tappable buttons.
//
// Used by the lexicon reader, Tafseer reader, and Uloom (Irab) reader so all
// three share the same affordance and the same regex grammar.

export type ProseSegment =
  | { kind: 'text';  value: string }
  | { kind: 'qref';  value: string; surah: number; ayah: number }
  | { kind: 'fn';    value: string; fn: number };

/**
 * Tokenize a prose string into runs of text, Quran refs, and footnote
 * markers. `knownFootnotes` filters spurious `(N)` parentheticals so only
 * numbers actually present in the entry's footnote list become buttons.
 * Pass `undefined` or omit when the renderer doesn't have a footnote list.
 */
export function bodySegments(
  text: string | null | undefined,
  knownFootnotes?: ReadonlySet<number>,
): ProseSegment[] {
  if (!text) return [];
  // Q.S:A or Q. S–A — first alternative; (N) — second alternative.
  const RX = /\bQ\.?\s*(\d{1,3})\s*[:\-–]\s*(\d{1,3})\b|\((\d{1,3})\)/g;
  const out: ProseSegment[] = [];
  let cur = 0;
  let m: RegExpExecArray | null;
  while ((m = RX.exec(text)) != null) {
    let token: ProseSegment | null = null;
    if (m[1] && m[2]) {
      const surah = parseInt(m[1], 10);
      const ayah  = parseInt(m[2], 10);
      if (!(surah >= 1 && surah <= 114 && ayah >= 1)) continue;
      token = { kind: 'qref', value: m[0], surah, ayah };
    } else if (m[3]) {
      const num = parseInt(m[3], 10);
      // Only emit a footnote token if caller confirms the number exists;
      // otherwise it's just prose parentheses and should stay text.
      if (!knownFootnotes || !knownFootnotes.has(num)) continue;
      token = { kind: 'fn', value: m[0], fn: num };
    }
    if (!token) continue;
    if (m.index > cur) out.push({ kind: 'text', value: text.slice(cur, m.index) });
    out.push(token);
    cur = m.index + m[0].length;
  }
  if (cur < text.length) out.push({ kind: 'text', value: text.slice(cur) });
  return out;
}
