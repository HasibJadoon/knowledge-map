// server/openaiGenerateLesson.ts
// Works in Node 18+ (native fetch) OR Cloudflare Workers (fetch).
// Docs: Responses API + Structured outputs. :contentReference[oaicite:3]{index=3}

type GenerateLessonRequest = {
  lesson: any; // your ArabicLesson JSON coming from client
  options?: {
    model?: string;
    strict?: boolean;
  };
};

export async function generateLessonWithOpenAI(
  payload: GenerateLessonRequest,
  env: { OPENAI_API_KEY: string }
) {
  const model = payload.options?.model ?? "gpt-4.1-mini"; // pick what you use
  const strict = payload.options?.strict ?? true;

  // ---- Minimal JSON schema for the OUTPUT (you can expand fully)
  // Keep it strict to prevent drift. :contentReference[oaicite:4]{index=4}
  const outputSchema = {
    name: "ArabicLessonGenerated",
    strict,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["entity_type", "id", "lesson_type", "reference", "text", "sentences", "passage_layers", "comprehension"],
      properties: {
        entity_type: { const: "ar_lesson" },
        id: { type: "string" },
        lesson_type: { type: "string" },
        subtype: { anyOf: [{ type: "string" }, { type: "null" }] },
        title: { type: "string" },
        title_ar: { anyOf: [{ type: "string" }, { type: "null" }] },
        status: { type: "string" },
        difficulty: { type: "integer" },

        reference: {
          type: "object",
          additionalProperties: false,
          required: ["source_type", "source_ref_id", "surah", "ayah_from", "ayah_to", "ref_label", "citation"],
          properties: {
            source_type: { type: "string" },
            source_ref_id: { anyOf: [{ type: "string" }, { type: "null" }] },
            surah: { anyOf: [{ type: "integer" }, { type: "null" }] },
            ayah_from: { anyOf: [{ type: "integer" }, { type: "null" }] },
            ayah_to: { anyOf: [{ type: "integer" }, { type: "null" }] },
            ref_label: { anyOf: [{ type: "string" }, { type: "null" }] },
            citation: { anyOf: [{ type: "string" }, { type: "null" }] },
          },
        },

        text: {
          type: "object",
          additionalProperties: false,
          required: ["arabic_full", "mode"],
          properties: {
            mode: { type: "string" },
            arabic_full: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["unit_id", "unit_type", "arabic", "translation", "surah", "ayah", "notes"],
                properties: {
                  unit_id: { type: "string" },
                  unit_type: { const: "ayah" },
                  arabic: { type: "string" },
                  translation: { anyOf: [{ type: "string" }, { type: "null" }] },
                  surah: { type: "integer" },
                  ayah: { type: "integer" },
                  notes: { anyOf: [{ type: "string" }, { type: "null" }] },
                },
              },
            },
          },
        },

        sentences: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["sentence_id", "unit_id", "arabic", "translation", "notes", "tokens"],
            properties: {
              sentence_id: { type: "string" },
              unit_id: { type: "string" },
              arabic: { type: "string" },
              translation: { anyOf: [{ type: "string" }, { type: "null" }] },
              notes: { anyOf: [{ type: "string" }, { type: "null" }] },
              grammar_concept_refs: { anyOf: [{ type: "array", items: { type: "string" } }, { type: "null" }] },
              tokens: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["token_id", "surface_ar", "lemma_ar", "root", "root_id", "pos"],
                  properties: {
                    token_id: { type: "string" },
                    surface_ar: { type: "string" }, // must include "و" as its own token when applicable
                    lemma_ar: { anyOf: [{ type: "string" }, { type: "null" }] },
                    root: { anyOf: [{ type: "string" }, { type: "null" }] },
                    root_id: { anyOf: [{ type: "integer" }, { type: "null" }] },
                    pos: { type: "string" },
                    features: { anyOf: [{ type: "object" }, { type: "null" }] },
                    morph_ref: {
                      anyOf: [
                        {
                          type: "object",
                          additionalProperties: false,
                          required: ["root_id", "lexicon_entry_id"],
                          properties: {
                            root_id: { anyOf: [{ type: "integer" }, { type: "null" }] },
                            lexicon_entry_id: { anyOf: [{ type: "integer" }, { type: "null" }] },
                          },
                        },
                        { type: "null" },
                      ],
                    },
                  },
                },
              },
            },
          },
        },

        passage_layers: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["layer_id", "layer_type", "label", "label_ar", "linked_unit_ids", "linked_sentence_ids", "linked_token_ids", "notes"],
            properties: {
              layer_id: { type: "string" },
              layer_type: { type: "string" },
              label: { type: "string" },
              label_ar: { anyOf: [{ type: "string" }, { type: "null" }] },
              linked_unit_ids: { type: "array", items: { type: "string" } },
              linked_sentence_ids: { type: "array", items: { type: "string" } },
              linked_token_ids: { type: "array", items: { type: "string" } },
              notes: { anyOf: [{ type: "string" }, { type: "null" }] },
              data: { anyOf: [{ type: "object" }, { type: "null" }] },
            },
          },
        },

        comprehension: {
          type: "object",
          additionalProperties: false,
          required: ["reflective", "analytical", "mcqs"],
          properties: {
            reflective: { type: "array", items: { type: "object" } },
            analytical: { type: "array", items: { type: "object" } },
            mcqs: { type: "object" },
          },
        },

        created_at: { type: "string" },
        updated_at: { anyOf: [{ type: "string" }, { type: "null" }] },
      },
    },
  };

  // Instruction: keep your Arabic EXACT (including ayah markers), split harf tokens, etc.
  const systemInstructions = `
You are generating a structured Arabic lesson object.
HARD RULES:
- Do NOT alter the Arabic units. Keep each ayah string EXACT as provided (including ﴿١﴾ markers).
- Tokenize by splitting attached harf when present: و / ف / ب / ك / ل / س must be their own tokens if attached (e.g., "وكذلك" => ["و","كذلك"]).
- Sentences are analysis chunks that reference unit_id.
- grammar_concept_refs: only reference concept IDs (strings). Do not define wv_concepts here.
- Provide discourse/rhetoric/reasoning layers in passage_layers.
- Populate comprehension with reflective + analytical + MCQs.
Return ONLY JSON matching the schema.
`.trim();

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`, // :contentReference[oaicite:5]{index=5}
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      // Responses API supports "input" and "text.format" for structured outputs :contentReference[oaicite:6]{index=6}
      input: [
        { role: "system", content: systemInstructions },
        { role: "user", content: JSON.stringify(payload.lesson) },
      ],
      text: {
        format: {
          type: "json_schema",
          json_schema: outputSchema,
        },
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${errText}`);
  }

  const data = await res.json();

  // Responses API typically returns structured content under output_text / output[].content
  // Handle both safely:
  const outputText =
    data.output_text ??
    data.output?.flatMap((o: any) => o.content ?? [])
      ?.map((c: any) => c.text)
      ?.filter(Boolean)
      ?.join("\n");

  if (!outputText) throw new Error("No output_text returned from OpenAI response.");

  return JSON.parse(outputText);
}


// server/openaiGenerateLesson.ts
// Works in Node 18+ (native fetch) OR Cloudflare Workers (fetch).
// Docs: Responses API + Structured outputs. :contentReference[oaicite:3]{index=3}

type GenerateLessonRequest = {
  lesson: any; // your ArabicLesson JSON coming from client
  options?: {
    model?: string;
    strict?: boolean;
  };
};

export async function generateLessonWithOpenAI(
  payload: GenerateLessonRequest,
  env: { OPENAI_API_KEY: string }
) {
  const model = payload.options?.model ?? "gpt-4.1-mini"; // pick what you use
  const strict = payload.options?.strict ?? true;

  // ---- Minimal JSON schema for the OUTPUT (you can expand fully)
  // Keep it strict to prevent drift. :contentReference[oaicite:4]{index=4}
  const outputSchema = {
    name: "ArabicLessonGenerated",
    strict,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["entity_type", "id", "lesson_type", "reference", "text", "sentences", "passage_layers", "comprehension"],
      properties: {
        entity_type: { const: "ar_lesson" },
        id: { type: "string" },
        lesson_type: { type: "string" },
        subtype: { anyOf: [{ type: "string" }, { type: "null" }] },
        title: { type: "string" },
        title_ar: { anyOf: [{ type: "string" }, { type: "null" }] },
        status: { type: "string" },
        difficulty: { type: "integer" },

        reference: {
          type: "object",
          additionalProperties: false,
          required: ["source_type", "source_ref_id", "surah", "ayah_from", "ayah_to", "ref_label", "citation"],
          properties: {
            source_type: { type: "string" },
            source_ref_id: { anyOf: [{ type: "string" }, { type: "null" }] },
            surah: { anyOf: [{ type: "integer" }, { type: "null" }] },
            ayah_from: { anyOf: [{ type: "integer" }, { type: "null" }] },
            ayah_to: { anyOf: [{ type: "integer" }, { type: "null" }] },
            ref_label: { anyOf: [{ type: "string" }, { type: "null" }] },
            citation: { anyOf: [{ type: "string" }, { type: "null" }] },
          },
        },

        text: {
          type: "object",
          additionalProperties: false,
          required: ["arabic_full", "mode"],
          properties: {
            mode: { type: "string" },
            arabic_full: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["unit_id", "unit_type", "arabic", "translation", "surah", "ayah", "notes"],
                properties: {
                  unit_id: { type: "string" },
                  unit_type: { const: "ayah" },
                  arabic: { type: "string" },
                  translation: { anyOf: [{ type: "string" }, { type: "null" }] },
                  surah: { type: "integer" },
                  ayah: { type: "integer" },
                  notes: { anyOf: [{ type: "string" }, { type: "null" }] },
                },
              },
            },
          },
        },

        sentences: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["sentence_id", "unit_id", "arabic", "translation", "notes", "tokens"],
            properties: {
              sentence_id: { type: "string" },
              unit_id: { type: "string" },
              arabic: { type: "string" },
              translation: { anyOf: [{ type: "string" }, { type: "null" }] },
              notes: { anyOf: [{ type: "string" }, { type: "null" }] },
              grammar_concept_refs: { anyOf: [{ type: "array", items: { type: "string" } }, { type: "null" }] },
              tokens: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["token_id", "surface_ar", "lemma_ar", "root", "root_id", "pos"],
                  properties: {
                    token_id: { type: "string" },
                    surface_ar: { type: "string" }, // must include "و" as its own token when applicable
                    lemma_ar: { anyOf: [{ type: "string" }, { type: "null" }] },
                    root: { anyOf: [{ type: "string" }, { type: "null" }] },
                    root_id: { anyOf: [{ type: "integer" }, { type: "null" }] },
                    pos: { type: "string" },
                    features: { anyOf: [{ type: "object" }, { type: "null" }] },
                    morph_ref: {
                      anyOf: [
                        {
                          type: "object",
                          additionalProperties: false,
                          required: ["root_id", "lexicon_entry_id"],
                          properties: {
                            root_id: { anyOf: [{ type: "integer" }, { type: "null" }] },
                            lexicon_entry_id: { anyOf: [{ type: "integer" }, { type: "null" }] },
                          },
                        },
                        { type: "null" },
                      ],
                    },
                  },
                },
              },
            },
          },
        },

        passage_layers: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["layer_id", "layer_type", "label", "label_ar", "linked_unit_ids", "linked_sentence_ids", "linked_token_ids", "notes"],
            properties: {
              layer_id: { type: "string" },
              layer_type: { type: "string" },
              label: { type: "string" },
              label_ar: { anyOf: [{ type: "string" }, { type: "null" }] },
              linked_unit_ids: { type: "array", items: { type: "string" } },
              linked_sentence_ids: { type: "array", items: { type: "string" } },
              linked_token_ids: { type: "array", items: { type: "string" } },
              notes: { anyOf: [{ type: "string" }, { type: "null" }] },
              data: { anyOf: [{ type: "object" }, { type: "null" }] },
            },
          },
        },

        comprehension: {
          type: "object",
          additionalProperties: false,
          required: ["reflective", "analytical", "mcqs"],
          properties: {
            reflective: { type: "array", items: { type: "object" } },
            analytical: { type: "array", items: { type: "object" } },
            mcqs: { type: "object" },
          },
        },

        created_at: { type: "string" },
        updated_at: { anyOf: [{ type: "string" }, { type: "null" }] },
      },
    },
  };

  // Instruction: keep your Arabic EXACT (including ayah markers), split harf tokens, etc.
  const systemInstructions = `
You are generating a structured Arabic lesson object.
HARD RULES:
- Do NOT alter the Arabic units. Keep each ayah string EXACT as provided (including ﴿١﴾ markers).
- Tokenize by splitting attached harf when present: و / ف / ب / ك / ل / س must be their own tokens if attached (e.g., "وكذلك" => ["و","كذلك"]).
- Sentences are analysis chunks that reference unit_id.
- grammar_concept_refs: only reference concept IDs (strings). Do not define wv_concepts here.
- Provide discourse/rhetoric/reasoning layers in passage_layers.
- Populate comprehension with reflective + analytical + MCQs.
Return ONLY JSON matching the schema.
`.trim();

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`, // :contentReference[oaicite:5]{index=5}
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      // Responses API supports "input" and "text.format" for structured outputs :contentReference[oaicite:6]{index=6}
      input: [
        { role: "system", content: systemInstructions },
        { role: "user", content: JSON.stringify(payload.lesson) },
      ],
      text: {
        format: {
          type: "json_schema",
          json_schema: outputSchema,
        },
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${errText}`);
  }

  const data = await res.json();

  // Responses API typically returns structured content under output_text / output[].content
  // Handle both safely:
  const outputText =
    data.output_text ??
    data.output?.flatMap((o: any) => o.content ?? [])
      ?.map((c: any) => c.text)
      ?.filter(Boolean)
      ?.join("\n");

  if (!outputText) throw new Error("No output_text returned from OpenAI response.");

  return JSON.parse(outputText);
}


// server/routes/arLessons.ts
import type { Request, Response } from "express";
import { generateLessonWithOpenAI } from "../openaiGenerateLesson";

export async function postLessonGenerate(req: Request, res: Response) {
  try {
    const lesson = req.body; // ArabicLesson from your app
    const enriched = await generateLessonWithOpenAI(
      { lesson, options: { model: "gpt-4.1-mini", strict: true } },
      { OPENAI_API_KEY: process.env.OPENAI_API_KEY! }
    );

    // You can now insert enriched into your D1 / SQLite
    // res.json(enriched) for client to render instantly
    res.status(200).json(enriched);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "unknown_error" });
  }
}

