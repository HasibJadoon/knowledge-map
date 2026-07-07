// Shared inline-markup renderer for the Morph Display Layer.
//   ==critical==  → pink/red glowing (the one most-critical concept)
//   **key**       → gold semibold
//   → ← ⟶         → glowing gold connector
//   embedded Arabic → Amiri, coloured by tier
// Returns an HTML string (caller sanitizes with bypassSecurityTrustHtml).

const esc = (s: string): string =>
  s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export function richMarkup(str: string | null | undefined, lang: 'en' | 'ar' | 'ur' = 'en'): string {
  if (!str) return '';
  const arCount = (str.match(/[؀-ۿ]/g) || []).length;
  const latCount = (str.match(/[A-Za-z]/g) || []).length;
  const arP = lang === 'ar' || arCount > latCount;

  const seg = (text: string, mode: 'plain' | 'key' | 'crit'): string => {
    const tok = /([؀-ۿ](?:[؀-ۿ]|\s(?=[؀-ۿ]))*)|([←→⟶])/g;
    let out = '', last = 0, m: RegExpExecArray | null;
    const wrap = (t: string) => {
      const e = esc(t);
      if (mode === 'crit') return `<b class="rc">${e}</b>`;
      if (mode === 'key') return `<b class="rk">${e}</b>`;
      return e;
    };
    while ((m = tok.exec(text))) {
      if (m.index > last) out += wrap(text.slice(last, m.index));
      if (m[1]) {
        out += (arP && mode === 'plain') ? esc(m[1]) : `<span dir="rtl" class="ra ${mode}">${esc(m[1])}</span>`;
      } else if (m[2]) {
        out += `<span class="rarrow ${mode}">${m[2]}</span>`;
      }
      last = tok.lastIndex;
    }
    if (last < text.length) out += wrap(text.slice(last));
    return out;
  };

  const mk = /(==)([^=]+)==|(\*\*)([^*]+)\*\*/g;
  let out = '', last = 0, m: RegExpExecArray | null;
  while ((m = mk.exec(str))) {
    if (m.index > last) out += seg(str.slice(last, m.index), 'plain');
    out += m[1] === '==' ? seg(m[2], 'crit') : seg(m[4], 'key');
    last = mk.lastIndex;
  }
  if (last < str.length) out += seg(str.slice(last), 'plain');
  return out;
}
