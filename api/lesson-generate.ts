import { generateLessonWithClaude } from "./claudeGenerateLesson";
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
      new Response(
        JSON.stringify({ ok: false, error: "Invalid JSON body" }),
        { status: 400, headers: jsonHeaders }
      )
    );
  }

  const passage = typeof body?.passage === "string" ? body.passage.trim() : "";
  const textBlock = typeof body?.text === "string" ? body.text : undefined;
  const lessonInput =
    body?.lesson ?? (textBlock ? { text: { arabic: textBlock } } : null) ??
    (passage ? { text: { arabic: passage } } : null);

  if (!lessonInput) {
    return toWorkerResponse(
      new Response(
        JSON.stringify({ ok: false, error: "lesson or text/passage input is required" }),
        { status: 400, headers: jsonHeaders }
      )
    );
  }

  try {
    const generationResult = await generateLessonWithClaude(
      {
        lesson: lessonInput,
        options: typeof body?.options === "object" ? body.options : undefined,
      },
      env
    );
    if (!generationResult.ok) {
      return toWorkerResponse(
        new Response(
          JSON.stringify({
            ok: false,
            error: generationResult.error,
            raw_output: generationResult.raw_output,
            generated_at: new Date().toISOString(),
            input: lessonInput,
          }),
          { headers: jsonHeaders }
        )
      );
    }

    return toWorkerResponse(
      new Response(
        JSON.stringify({
          ok: true,
          generated_lesson: generationResult.lesson,
          generated_at: new Date().toISOString(),
          input: lessonInput,
        }),
        { headers: jsonHeaders }
      )
    );
  } catch (err: any) {
    return toWorkerResponse(
      new Response(
        JSON.stringify({ ok: false, error: err?.message ?? "Failed to generate lesson" }),
        { status: 500, headers: jsonHeaders }
      )
    );
  }
};
