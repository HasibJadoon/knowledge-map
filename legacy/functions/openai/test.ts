import type { PagesFunction } from '@cloudflare/workers-types';

import { json, parseBody, readOptionalString, readTrimmed } from '../_utils/sprint';
import { runOpenAITextPrompt } from '../_utils/openai';

interface Env {
  OPENAI_API_KEY?: string;
}

type TestInput = {
  prompt: string;
  system: string | null;
  model: string | null;
  maxOutputTokens: number | null;
  temperature: number | null;
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const body = await parseBody(ctx.request);
    if (!body) {
      return json({ ok: false, error: 'Invalid JSON payload.' }, 400);
    }

    const input = normalizeInput(body);
    if (!input) {
      return json({ ok: false, error: 'A prompt is required.' }, 400);
    }

    const result = await runOpenAITextPrompt(
      {
        prompt: input.prompt,
        system: input.system,
        model: input.model,
        maxOutputTokens: input.maxOutputTokens,
        temperature: input.temperature,
      },
      ctx.env,
    );

    return json({
      ok: true,
      response_id: result.id,
      model: result.model,
      output_text: result.outputText,
      usage: result.usage,
      requested_by: user.id,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to call OpenAI.';
    const status = message.includes('OPENAI_API_KEY is not configured') ? 503 : 500;
    return json({ ok: false, error: message }, status);
  }
};

function normalizeInput(body: Record<string, unknown>): TestInput | null {
  const prompt = readTrimmed(body['prompt']);
  if (!prompt || prompt.length > 8_000) {
    return null;
  }

  const system = readOptionalString(body['system']);
  const model = readOptionalString(body['model']);
  const maxOutputTokens = readOptionalNumber(body['maxOutputTokens'] ?? body['max_output_tokens']);
  const temperature = readOptionalNumber(body['temperature']);

  return {
    prompt,
    system,
    model,
    maxOutputTokens,
    temperature,
  };
}

function readOptionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
