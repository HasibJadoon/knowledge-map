#!/usr/bin/env node
import fs from "fs";
import path from "path";

const repoRoot = process.cwd();
const dataRoot = path.join(repoRoot, "database", "data", "synonyms", "data-master");
const synonymsMapPath = path.join(dataRoot, "synonyms", "synonyms_map.json");
const wordsPath = path.join(dataRoot, "synonyms", "synonyms_words_ar.json");
const outputPath = path.join(repoRoot, "database", "seeds", "seed-ar_quran_synonyms.sql");

function readJson(p) {
  let text = fs.readFileSync(p, "utf8");
  text = text.replace(/^\uFEFF/, "");
  return JSON.parse(text);
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  const str = String(value).replace(/'/g, "''");
  return `'${str}'`;
}

const AR_DIACRITICS = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const TATWEEL = /\u0640/g;

function normalizeArabicWord(word) {
  let out = (word || "").trim();
  if (!out) return null;
  out = out.replace(AR_DIACRITICS, "").replace(TATWEEL, "");
  out = out.replace(/[^\p{Script=Arabic}]/gu, "");
  return out || null;
}

function splitVariants(text) {
  const base = (text || "").split("(")[0].trim();
  if (!base) return [];
  return base
    .split(/[-–—]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildSynonymMap(synonyms) {
  const map = new Map();
  for (const syn of synonyms || []) {
    const rawAr = syn.word_ar || "";
    const rawEn = syn.word_en || "";
    const rawRoot = syn.root || null;
    const rawRootAr = syn.root_ar || null;

    const arParts = splitVariants(rawAr);
    const enParts = splitVariants(rawEn);

    if (arParts.length > 1 && enParts.length > 1 && arParts.length === enParts.length) {
      for (let i = 0; i < arParts.length; i++) {
        const norm = normalizeArabicWord(arParts[i]);
        if (!norm) continue;
        if (!map.has(norm)) {
          map.set(norm, {
            word_ar: arParts[i],
            word_en: enParts[i],
            root_norm: rawRoot || null,
            root_ar: rawRootAr || null,
          });
        }
      }
    } else {
      for (const part of arParts.length ? arParts : [rawAr]) {
        const norm = normalizeArabicWord(part);
        if (!norm) continue;
        if (!map.has(norm)) {
          map.set(norm, {
            word_ar: part || rawAr || norm,
            word_en: rawEn || null,
            root_norm: rawRoot || null,
            root_ar: rawRootAr || null,
          });
        }
      }
    }
  }
  return map;
}

const synonymsMap = readJson(synonymsMapPath);
const wordsMap = readJson(wordsPath);

const wordsById = new Map();
for (const item of wordsMap.topics || []) {
  if (!item || !item.id) continue;
  wordsById.set(item.id, item);
}

const lines = [];
lines.push("DELETE FROM ar_quran_synonym_topic_words;");
lines.push("DELETE FROM ar_quran_synonym_topics;");

for (const topic of synonymsMap.topics || []) {
  if (!topic || !topic.id) continue;
  const wordsEntry = wordsById.get(topic.id);
  const wordsAr = wordsEntry?.words_ar || [];
  const meta = {};
  if (Array.isArray(topic.verses) && topic.verses.length) meta.verses = topic.verses;
  if (topic.summary) meta.summary = topic.summary;
  const metaJson = Object.keys(meta).length ? JSON.stringify(meta) : null;

  const values = [
    topic.id,
    topic.topic || topic.word || "",
    topic.topic_ur || null,
    metaJson,
  ];

  lines.push(
    `INSERT INTO ar_quran_synonym_topics (` +
      `topic_id, topic_en, topic_ur, meta_json` +
      `) VALUES (${values.map(sqlLiteral).join(", ")});`
  );

  const synonymMap = buildSynonymMap(topic.synonyms || []);
  for (let i = 0; i < wordsAr.length; i++) {
    const wordNorm = wordsAr[i];
    const info = synonymMap.get(wordNorm);
    const wordAr = info?.word_ar || wordNorm;
    const wordEn = info?.word_en || null;
    const rootNorm = info?.root_norm || null;
    const rootAr = info?.root_ar || null;
    lines.push(
      `INSERT INTO ar_quran_synonym_topic_words (` +
        `topic_id, word_norm, word_ar, word_en, root_norm, root_ar, order_index, meta_json` +
        `) VALUES (${[
          sqlLiteral(topic.id),
          sqlLiteral(wordNorm),
          sqlLiteral(wordAr),
          sqlLiteral(wordEn),
          sqlLiteral(rootNorm),
          sqlLiteral(rootAr),
          sqlLiteral(i),
          "NULL",
        ].join(", ")});`
    );
  }
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, lines.join("\n") + "\n");
console.log(`Wrote ${outputPath}`);
