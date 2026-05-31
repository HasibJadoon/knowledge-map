-- ═══════════════════════════════════════════════════════════════════════════
-- K-MAPS  km_worldview — Seed: source-unit illustration (dark theme)
-- File   : database/seeds/seed-wv-arjana-mwi-illustrations.sql
-- DB     : km_worldview   (binding: DB_WV)
-- Table  : wv_source_unit_illustrations  (migration 003)
-- Run    : wrangler d1 execute km_worldview --remote \
--            --file=database/seeds/seed-wv-arjana-mwi-illustrations.sql
--
-- One dark-themed analytical illustration for Arjana, "Muslims in the Western
-- Imagination" (2015), Chapter 1 · Concept 1 of 7. The full standalone HTML
-- document is stored verbatim in html_content and served by the worker at
--   GET /worldview/illustrations/WV:ILLUS-ARJANA-MWI-C1-CONCEPT1/page
-- so both the desktop (apps/k-maps) and Ionic (apps/app-k-maps) readers render
-- the same row. Source of the HTML:
--   database/seeds/illustrations/arjana-mwi-c1-orientalism-five-things.dark.html
--
-- Idempotent: INSERT OR REPLACE keyed on a deterministic id. To attach to a
-- different chapter, change source_unit_id below.
-- ═══════════════════════════════════════════════════════════════════════════

INSERT OR REPLACE INTO wv_source_unit_illustrations
  (id, source_unit_id, source_id, slug, order_index, title, caption, theme,
   html_content, meta_json, created_at, updated_at)
VALUES (
  'WV:ILLUS-ARJANA-MWI-C1-CONCEPT1',
  'sru-arjana-mwi-intro',
  'src-arjana-muslims-western-imagination-2015',
  'arjana-mwi-c1-orientalism-five-things',
  1,
  'Orientalism is five things at once',
  'Chapter 1 · Concept 1 of 7 — the five registers Orientalism operates on at once.',
  'dark',
  '<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>1 · Orientalism is five things at once</title>
<style>
  /* K-MAPS dark palette — tracks apps/k-maps/src/scss/_tokens.scss */
  :root{--paper:#080808;--panel:#141414;--ink:rgba(255,255,255,0.92);--ink2:rgba(255,255,255,0.55);
    --ink3:rgba(255,255,255,0.30);--gold:#c9a84c;--gold-bright:#e8c96a;--gold-dim:#7a6432;
    --line:rgba(255,255,255,0.10);--line-gold:rgba(201,168,76,0.35)}
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--paper);color:var(--ink);
    font-family:Georgia,"Times New Roman",serif;line-height:1.55;padding:22px 16px 48px}
  .wrap{max-width:760px;margin:0 auto}
  .kicker{font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:var(--gold);font-weight:bold}
  h1{font-size:27px;line-height:1.1;margin:6px 0 4px;letter-spacing:-.01em;color:var(--ink)}
  .sub{font-style:italic;color:var(--ink2);font-size:15px;border-bottom:2px solid var(--line-gold);padding-bottom:14px;margin-bottom:18px}
  .lede{font-size:15px;color:var(--ink2);margin:0 0 18px}
  svg{width:100%;height:auto;display:block}
  .facetlist{margin:20px 0 0;border-top:1px solid var(--line);padding-top:6px}
  .facet{display:flex;gap:12px;padding:11px 0;border-bottom:1px solid var(--line)}
  .facet .tag{flex:0 0 132px;font-weight:bold;font-size:13.5px;color:var(--ink)}
  .facet .desc{font-size:13.5px;color:var(--ink2)}
  .so{background:rgba(201,168,76,0.08);color:rgba(255,255,255,0.88);border:1px solid var(--line-gold);
    border-radius:8px;padding:14px 16px;margin-top:22px;font-size:14px}
  .so b{letter-spacing:.04em;color:var(--gold-bright)}
  em{color:var(--ink)}
  footer{margin-top:26px;font-size:12px;color:var(--ink3);font-style:italic;border-top:1px solid var(--line);padding-top:12px}
</style>
</head>
<body>
<div class="wrap">
  <div class="kicker">Chapter 1 · Session 1 · Concept 1 of 7</div>
  <h1>Orientalism is five things at once</h1>
  <div class="sub">The Muslim of Orientalism · pp. 8&ndash;12</div>

  <p class="lede">Arjana deliberately refuses a single tidy definition. Orientalism, for her, operates on five registers at the same time &mdash; and their combined effect is to lend the Western fantasy of Islam the weight of reality. That is why she calls it the thing that <em>substantiates the imaginaire</em>.</p>

  <svg viewBox="0 0 620 360" role="img" aria-label="Radial diagram: Orientalism at center with five facets">
    <defs>
      <marker id="a" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
        <path d="M0,0 L9,4.5 L0,9 Z" fill="#7a6432"/></marker>
    </defs>
    <!-- spokes -->
    <g stroke="#7a6432" stroke-width="1.5">
      <line x1="310" y1="180" x2="310" y2="78"/>
      <line x1="310" y1="180" x2="525" y2="135"/>
      <line x1="310" y1="180" x2="470" y2="300"/>
      <line x1="310" y1="180" x2="150" y2="300"/>
      <line x1="310" y1="180" x2="95" y2="135"/>
    </g>
    <!-- center -->
    <circle cx="310" cy="180" r="58" fill="#c9a84c" stroke="#7a6432" stroke-width="2.5"/>
    <text x="310" y="176" text-anchor="middle" font-size="19" font-weight="bold" fill="#080808">Orient-</text>
    <text x="310" y="198" text-anchor="middle" font-size="19" font-weight="bold" fill="#080808">alism</text>
    <!-- facets -->
    <g text-anchor="middle" font-size="13" font-weight="bold">
      <g><rect x="232" y="34" width="156" height="46" rx="7" fill="#141414" stroke="#7a6432" stroke-width="1.6"/>
        <text x="310" y="54" fill="#e8e2d6">colonial</text><text x="310" y="71" fill="#e8e2d6">language</text></g>
      <g><rect x="438" y="112" width="172" height="46" rx="7" fill="#141414" stroke="#7a6432" stroke-width="1.6"/>
        <text x="524" y="132" fill="#e8e2d6">classification</text><text x="524" y="149" fill="#e8e2d6">system</text></g>
      <g><rect x="392" y="278" width="160" height="46" rx="7" fill="#141414" stroke="#7a6432" stroke-width="1.6"/>
        <text x="472" y="298" fill="#e8e2d6">artistic</text><text x="472" y="315" fill="#e8e2d6">movement</text></g>
      <g><rect x="62" y="278" width="168" height="46" rx="7" fill="#141414" stroke="#7a6432" stroke-width="1.6"/>
        <text x="146" y="298" fill="#e8e2d6">academic</text><text x="146" y="315" fill="#e8e2d6">discipline</text></g>
      <g><rect x="8" y="112" width="172" height="46" rx="7" fill="#141414" stroke="#7a6432" stroke-width="1.6"/>
        <text x="94" y="132" fill="#e8e2d6">an attitude</text><text x="94" y="149" fill="#e8e2d6">to the world</text></g>
    </g>
  </svg>

  <div class="facetlist">
    <div class="facet"><div class="tag">Colonial language</div><div class="desc">A way of speaking that already assumes Western mastery &mdash; the vocabulary of ruler and ruled.</div></div>
    <div class="facet"><div class="tag">Classification system</div><div class="desc">Sorts peoples and cultures into fixed types; the Muslim becomes a category, not a person.</div></div>
    <div class="facet"><div class="tag">Artistic movement</div><div class="desc">Paintings, novels, and design that make the exotic East vivid, sensual, and consumable.</div></div>
    <div class="facet"><div class="tag">Academic discipline</div><div class="desc">University study that lends the fantasy citations, method, and the authority of scholarship.</div></div>
    <div class="facet"><div class="tag">An attitude</div><div class="desc">A baseline disposition toward the world in which "the East" is always object, never author.</div></div>
  </div>

  <div class="so"><b>WHY IT MATTERS &mdash;</b> Each register alone might be dismissed. Working together, they make the imagined Muslim feel <em>known</em>. That combined authority is exactly what Orientalism contributes to the monster: not the creature itself, but its credibility.</div>

  <footer>Concept 1 of 7 · Arjana, <em>Muslims in the Western Imagination</em> (OUP, 2015) · analytical illustration, not a reproduction of the text.</footer>
</div>
</body>
</html>',
  json('{"book":"Muslims in the Western Imagination","author":"Sophia Rose Arjana","publisher":"OUP","year":2015,"chapter":1,"concept":"1 of 7","pages":"8-12"}'),
  '2026-05-31T00:00:00Z',
  '2026-05-31T00:00:00Z'
);
