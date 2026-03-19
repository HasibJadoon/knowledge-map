type OpenAITextRequest = {
  prompt: string;
  system?: string | null;
  model?: string | null;
  maxOutputTokens?: number | null;
  temperature?: number | null;
};

type OpenAIResponsesUsage = {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
};

type OpenAITextResult = {
  id: string | null;
  model: string;
  outputText: string;
  usage: OpenAIResponsesUsage | null;
};

type OpenAIEnv = {
  OPENAI_API_KEY?: string;
};

const DEFAULT_MODEL = 'gpt-5-mini';
const DEFAULT_MAX_OUTPUT_TOKENS = 300;
const MAX_OUTPUT_TOKENS_LIMIT = 4_000;

export async function runOpenAITextPrompt(
  input: OpenAITextRequest,
  env: OpenAIEnv,
): Promise<OpenAITextResult> {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }

  const prompt = input.prompt.trim();
  if (!prompt) {
    throw new Error('Prompt is required.');
  }

  const model = input.model?.trim() || DEFAULT_MODEL;
  const maxOutputTokens = clampMaxOutputTokens(input.maxOutputTokens);
  const temperature = clampTemperature(input.temperature);
  const system = input.system?.trim();

  let { response, payload } = await requestTextResponse({
    apiKey,
    model,
    prompt,
    system,
    maxOutputTokens,
    temperature,
  });

  if (!response.ok && temperature != null && shouldRetryWithoutTemperature(response.status, payload)) {
    ({ response, payload } = await requestTextResponse({
      apiKey,
      model,
      prompt,
      system,
      maxOutputTokens,
      temperature: null,
    }));
  }

  if (!response.ok) {
    const upstreamMessage = readErrorMessage(payload);
    throw new Error(`OpenAI error ${response.status}: ${upstreamMessage}`);
  }

  const outputText = extractOutputText(payload);
  if (!outputText) {
    throw new Error('OpenAI response did not include output text.');
  }

  return {
    id: readOptionalString(payload?.['id']),
    model,
    outputText,
    usage: readUsage(payload?.['usage']),
  };
}

async function requestTextResponse(input: {
  apiKey: string;
  model: string;
  prompt: string;
  system: string | undefined;
  maxOutputTokens: number;
  temperature: number | null;
}): Promise<{
  response: Response;
  payload: Record<string, unknown> | null;
}> {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${input.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: input.model,
      input: input.prompt,
      ...(input.system ? { instructions: input.system } : {}),
      max_output_tokens: input.maxOutputTokens,
      ...(buildReasoning(input.model) ? { reasoning: buildReasoning(input.model) } : {}),
      ...(input.temperature == null ? {} : { temperature: input.temperature }),
    }),
  });

  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  return { response, payload };
}

function buildReasoning(model: string): { effort: 'low' } | null {
  const normalized = model.trim().toLowerCase();
  if (normalized.startsWith('gpt-5')) {
    return { effort: 'low' };
  }
  return null;
}

function clampMaxOutputTokens(value: number | null | undefined): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_MAX_OUTPUT_TOKENS;
  }

  return Math.min(Math.max(Math.trunc(value as number), 1), MAX_OUTPUT_TOKENS_LIMIT);
}

function clampTemperature(value: number | null | undefined): number | null {
  if (!Number.isFinite(value)) {
    return null;
  }

  return Math.min(Math.max(Number(value), 0), 2);
}

function readErrorMessage(payload: Record<string, unknown> | null): string {
  const error = asRecord(payload?.['error']);
  return (
    readOptionalString(error?.['message']) ||
    readOptionalString(payload?.['message']) ||
    'Unknown upstream error'
  );
}

function shouldRetryWithoutTemperature(status: number, payload: Record<string, unknown> | null): boolean {
  if (status !== 400) {
    return false;
  }

  const message = readErrorMessage(payload).toLowerCase();
  return (
    message.includes('temperature') &&
    (message.includes('default (1) value is supported') || message.includes('not supported'))
  );
}

function extractOutputText(payload: Record<string, unknown> | null): string {
  const direct = readOptionalString(payload?.['output_text']);
  if (direct) {
    return direct;
  }

  const output = Array.isArray(payload?.['output']) ? payload['output'] : [];
  const textParts: string[] = [];
  for (const item of output) {
    const message = asRecord(item);
    const content = Array.isArray(message?.['content']) ? message['content'] : [];
    for (const entry of content) {
      const contentItem = asRecord(entry);
      const text =
        readOptionalString(contentItem?.['text']) ||
        readOptionalString(asRecord(contentItem?.['text'])?.['value']);
      if (text) {
        textParts.push(text);
      }
    }
  }

  return textParts.join('\n').trim();
}

function readUsage(value: unknown): OpenAIResponsesUsage | null {
  const usage = asRecord(value);
  if (!usage) {
    return null;
  }

  const inputTokens = readOptionalNumber(usage['input_tokens']) ?? readOptionalNumber(usage['prompt_tokens']);
  const outputTokens =
    readOptionalNumber(usage['output_tokens']) ?? readOptionalNumber(usage['completion_tokens']);
  const totalTokens = readOptionalNumber(usage['total_tokens']);

  if (inputTokens == null && outputTokens == null && totalTokens == null) {
    return null;
  }

  return {
    input_tokens: inputTokens ?? undefined,
    output_tokens: outputTokens ?? undefined,
    total_tokens: totalTokens ?? undefined,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readOptionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
