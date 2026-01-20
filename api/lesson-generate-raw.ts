import { generateLessonWithClaude } from "./claudeGenerateLesson";
import { buildSeedLessonFromText } from "./arabicLessonSeed";
import type { PagesFunction, Response as WorkerResponse } from "@cloudflare/workers-types";

interface Env {
  ANTHROPIC_API_KEY?: string;
  CLAUDE_API_KEY?: string;
}

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
    const result = await generateWithRetries(seed, env, options);
    return toWorkerResponse(
      new Response(JSON.stringify(result), { headers: jsonHeaders })
    );
  } catch (err: any) {
    return toWorkerResponse(
      new Response(JSON.stringify({ ok: false, error: err?.message ?? "Failed to generate lesson" }), {
        status: 500,
        headers: jsonHeaders,
      })
    );
  }
};

type RetryOptions = { max_tokens?: number; model?: string } | undefined;

type GenerationSummary =
  | { ok: true; lesson: any; raw_output: string; attempts: number; warnings: string[] }
  | { ok: false; error: string; raw_output?: string };

async function generateWithRetries(seed: any, env: Env, options?: RetryOptions): Promise<GenerationSummary> {
  const warnings: string[] = [];
  let currentLesson = seed;
  let lastRaw = "";
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await generateLessonWithClaude({ lesson: currentLesson, options }, env);
    if (!response.ok) {
      return { ok: false, error: response.error, raw_output: response.raw_output ?? lastRaw };
    }

    lastRaw = response.raw_output ?? lastRaw;
    if (isRichLesson(response.lesson)) {
      return {
        ok: true,
        lesson: response.lesson,
        raw_output: lastRaw,
        attempts: attempt,
        warnings,
      };
    }

    const missing = describeMissingSections(response.lesson);
    warnings.push(`Attempt ${attempt} incomplete: ${missing.join(", ") || "unknown"}.`);
    currentLesson = { ...currentLesson, ...response.lesson };
  }

  return {
    ok: true,
    lesson: currentLesson,
    raw_output: lastRaw,
    attempts: maxAttempts,
    warnings,
  };
}

function isRichLesson(lesson: any) {
  const sentences = Array.isArray(lesson?.sentences) ? lesson.sentences.length : 0;
  const passage = Array.isArray(lesson?.passage_layers) ? lesson.passage_layers.length : 0;
  const reflective = Array.isArray(lesson?.comprehension?.reflective)
    ? lesson.comprehension.reflective.length
    : 0;
  const analytical = Array.isArray(lesson?.comprehension?.analytical)
    ? lesson.comprehension.analytical.length
    : 0;
  const mcqs = lesson?.comprehension?.mcqs;
  const mcqText = Array.isArray(mcqs?.text) ? mcqs.text.length : 0;
  const mcqVocabulary = Array.isArray(mcqs?.vocabulary) ? mcqs.vocabulary.length : 0;
  const mcqGrammar = Array.isArray(mcqs?.grammar) ? mcqs.grammar.length : 0;

  return (
    sentences > 0 &&
    passage > 0 &&
    reflective > 0 &&
    analytical > 0 &&
    mcqText > 0 &&
    mcqVocabulary > 0 &&
    mcqGrammar > 0
  );
}

function describeMissingSections(lesson: any) {
  const missing: string[] = [];
  if (!Array.isArray(lesson?.sentences) || !lesson.sentences.length) {
    missing.push("sentences");
  }
  if (!Array.isArray(lesson?.passage_layers) || !lesson.passage_layers.length) {
    missing.push("passage_layers");
  }
  if (!Array.isArray(lesson?.comprehension?.reflective) || !lesson.comprehension.reflective.length) {
    missing.push("reflective questions");
  }
  if (!Array.isArray(lesson?.comprehension?.analytical) || !lesson.comprehension.analytical.length) {
    missing.push("analytical questions");
  }
  const mcqs = lesson?.comprehension?.mcqs;
  if (!Array.isArray(mcqs?.text) || !mcqs.text.length) {
    missing.push("text MCQs");
  }
  if (!Array.isArray(mcqs?.vocabulary) || !mcqs.vocabulary.length) {
    missing.push("vocabulary MCQs");
  }
  if (!Array.isArray(mcqs?.grammar) || !mcqs.grammar.length) {
    missing.push("grammar MCQs");
  }
  return missing;
}
