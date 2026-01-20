import { generateLessonWithClaude } from "./claudeGenerateLesson";
import { buildSeedLessonFromText } from "./arabicLessonSeed";
import {
  ArabicLessonMetadataSchema,
  ArabicLessonSentencesSchema,
  ArabicLessonPassageLayerSchema,
  ArabicLessonReflectiveAnalyticalSchema,
  ArabicLessonMCQSchema,
} from "./schemas/arabicLesson.schema";
import type { PagesFunction, Response as WorkerResponse } from "@cloudflare/workers-types";

interface Env {
  ANTHROPIC_API_KEY?: string;
  CLAUDE_API_KEY?: string;
}

const metadataInstructions = `
Return ONLY JSON matching the metadata schema.
- Lock in metadata fields (title, status, difficulty, reference) and the text.arabic_full array exactly as provided.
- Do not emit sentences, passage_layers, or comprehension content yet.
`.trim();

const sentencesInstructions = `
Return ONLY JSON matching the sentences schema.
- Populate sentence entries with tokens that reference text.arabic_full.unit_id values and split attached harf.
- Do not change metadata, passage_layers, or comprehension fields.
`.trim();

const passageLayerInstructions = `
Return ONLY JSON matching the passage layer schema.
- Provide at least three passage layers referencing sentence_id values and explain each move briefly.
- Do not mutate sentences, metadata, or comprehension entries.
`.trim();

const reflectiveAnalyticalInstructions = `
Return ONLY JSON matching the reflective/analytical schema.
- Create 3+ reflective questions plus 3+ analytical questions grounded in the sentences/passage layers already produced.
- Explain why each verb/noun or rhetorical feature matters.
- Leave MCQ entries untouched.
`.trim();

const mcqInstructions = `
Return ONLY JSON matching the MCQ schema.
- Generate three MCQs per group (text, vocabulary, grammar) and provide a short methodology_summary linking the progression.
- Reference the existing sentences/passage layers/tokens when justifying each question.
- Do not alter the reflective or analytical arrays.
`.trim();

const passDefinitions = [
  {
    name: "metadata",
    schema: ArabicLessonMetadataSchema,
    instructions: metadataInstructions,
    validate: (lesson: any) => Array.isArray(lesson?.text?.arabic_full) && lesson.text.arabic_full.length > 0,
    describeMissing: () => "text units",
  },
  {
    name: "sentences",
    schema: ArabicLessonSentencesSchema,
    instructions: sentencesInstructions,
    validate: (lesson: any) => Array.isArray(lesson?.sentences) && lesson.sentences.length >= 3,
    describeMissing: () => "sentences",
  },
  {
    name: "passage_layers",
    schema: ArabicLessonPassageLayerSchema,
    instructions: passageLayerInstructions,
    validate: (lesson: any) => Array.isArray(lesson?.passage_layers) && lesson.passage_layers.length >= 3,
    describeMissing: () => "passage layers",
  },
  {
    name: "reflective_analytical",
    schema: ArabicLessonReflectiveAnalyticalSchema,
    instructions: reflectiveAnalyticalInstructions,
    validate: (lesson: any) =>
      Array.isArray(lesson?.comprehension?.reflective) &&
      lesson.comprehension.reflective.length >= 3 &&
      Array.isArray(lesson?.comprehension?.analytical) &&
      lesson.comprehension.analytical.length >= 3,
    describeMissing: () => "reflective/analytical questions",
  },
  {
    name: "mcqs",
    schema: ArabicLessonMCQSchema,
    instructions: mcqInstructions,
    validate: (lesson: any) =>
      Array.isArray(lesson?.comprehension?.mcqs?.text) &&
      lesson.comprehension.mcqs.text.length >= 3 &&
      Array.isArray(lesson?.comprehension?.mcqs?.vocabulary) &&
      lesson.comprehension.mcqs.vocabulary.length >= 3 &&
      Array.isArray(lesson?.comprehension?.mcqs?.grammar) &&
      lesson.comprehension.mcqs.grammar.length >= 3,
    describeMissing: () => "MCQ groups",
  },
];

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "cache-control": "no-store",
};

const toWorkerResponse = (response: Response): WorkerResponse => response as WorkerResponse;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: Record<string, any> | null = null;
  try {
    body = (await request.json()) as Record<string, any>;
  } catch {
    return toWorkerResponse(
      new Response(JSON.stringify({ ok: false, error: "Invalid JSON body" }), {
        status: 400,
        headers: jsonHeaders,
      })
    );
  }

  const arabicText = typeof body?.text === "string" ? body.text.trim() : "";
  if (!arabicText) {
    return toWorkerResponse(
      new Response(JSON.stringify({ ok: false, error: "Arabic text is required" }), {
        status: 400,
        headers: jsonHeaders,
      })
    );
  }

  const surah = typeof body?.surah === "number" ? body.surah : 12;
  const mode = body?.mode === "sentence" ? "sentence" : "ayah";
  const options = typeof body?.options === "object" ? body.options : undefined;

  const seed = buildSeedLessonFromText(arabicText, { surah, mode });

  try {
    const result = await runPasses(seed, env, options);
    return toWorkerResponse(new Response(JSON.stringify(result), { headers: jsonHeaders }));
  } catch (err: any) {
    return toWorkerResponse(
      new Response(JSON.stringify({ ok: false, error: err?.message ?? "Failed to generate lesson" }), {
        status: 500,
        headers: jsonHeaders,
      })
    );
  }
};

async function runPasses(
  seed: any,
  env: Env,
  options?: { model?: string; max_tokens?: number }
) {
  let current = seed;
  const warnings: string[] = [];
  let lastRaw = "";
  let attempts = 0;

  for (const pass of passDefinitions) {
    const result = await executePass(current, env, options, pass);
    attempts += result.attempts;
    lastRaw = result.raw_output ?? lastRaw;
    warnings.push(...result.warnings);
    if (!result.ok) {
      return {
        ok: false,
        error: `Pass "${pass.name}" failed: ${result.error}`,
        raw_output: result.raw_output ?? lastRaw,
      };
    }
    current = result.lesson;
  }

  return {
    ok: true,
    lesson: current,
    raw_output: lastRaw,
    attempts,
    warnings,
  };
}

async function executePass(
  baseLesson: any,
  env: Env,
  options: { model?: string; max_tokens?: number } | undefined,
  pass: {
    name: string;
    schema: object;
    instructions: string;
    validate: (lesson: any) => boolean;
    describeMissing: (lesson: any) => string;
  }
) {
  const maxAttempts = 3;
  const resultWarnings: string[] = [];
  let lesson = baseLesson;
  let lastRaw = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await generateLessonWithClaude(
      {
        lesson,
        options,
        schema: pass.schema,
        systemInstructions: pass.instructions,
      },
      env
    );
    if (!response.ok) {
      return { ok: false, error: response.error, raw_output: response.raw_output ?? lastRaw, warnings: resultWarnings, attempts: attempt };
    }

    lastRaw = response.raw_output ?? lastRaw;
    lesson = mergeLesson(lesson, response.lesson);
    if (pass.validate(lesson)) {
      return { ok: true, lesson, raw_output: lastRaw, warnings: resultWarnings, attempts: attempt };
    }

    resultWarnings.push(`Attempt ${attempt} incomplete: ${pass.describeMissing(lesson)}.`);
  }

  return { ok: true, lesson, raw_output: lastRaw, warnings: resultWarnings, attempts: maxAttempts };
}

function mergeLesson(base: any, addition: any) {
  const merged = { ...base };
  for (const key of Object.keys(addition)) {
    if (key === "comprehension") {
      merged.comprehension = { ...(base.comprehension ?? {}), ...addition.comprehension };
    } else {
      merged[key] = addition[key];
    }
  }
  return merged;
}
