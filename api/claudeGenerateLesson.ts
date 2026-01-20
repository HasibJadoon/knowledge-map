import { ArabicLessonSchema } from "./schemas/arabicLesson.schema";

type GenerateLessonRequest = {
  lesson: any;
  options?: {
    model?: string;
    max_tokens?: number;
  };
};

type ClaudeEnv = {
  ANTHROPIC_API_KEY?: string;
  CLAUDE_API_KEY?: string;
};

type ClaudeLessonResponse =
  | { ok: true; lesson: any; raw_output: string }
  | { ok: false; error: string; raw_output: string };

export async function generateLessonWithClaude(
  payload: GenerateLessonRequest,
  env: ClaudeEnv
) {
  const key = env.ANTHROPIC_API_KEY ?? env.CLAUDE_API_KEY;
  if (!key) {
    throw new Error("Claude API key is missing");
  }

  const model = payload.options?.model ?? "claude-sonnet-4-5";
  const max_tokens = payload.options?.max_tokens ?? 4096;

const systemInstructions = `
You are generating a structured Arabic lesson JSON object with a strong emphasis on documenting HOW and WHY you selected each teaching artifact.
HARD RULES:
- Do NOT alter the Arabic ayah strings. Keep EXACT, including markers like ﴿١﴾.
- Tokenize by splitting attached harf when present: و / ف / ب / ك / ل / س must be their own tokens if attached (e.g., "وكذلك" => ["و","كذلك"]).
- sentences must reference their parent unit_id from text.arabic_full.
- grammar_concept_refs: only reference concept IDs (strings). Do NOT define new grammar concepts here.
- passage_layers must capture discourse / rhetoric / reasoning / idiom layers and include 1–2 sentences that explain the contextual/methodological reason for pointing at each layer (e.g., “Selected because the verb form ... shows ... in response to ...”).
- comprehension must include reflective + analytical + MCQs in 3 groups: text/vocabulary/grammar. Each question group should be prefaced (in a short descriptive field) with how verbs/nouns/vocab/grammar choices were inferred—mention the lexical forms, root connections, or narrative purpose that led to each prompt.
- When you list verbs, nouns, vocabulary fixes, grammar notes, or root-level observations, include why they matter: describe the methodological criterion (e.g., “chose this verb because it repeats the plural pronoun, highlighting ...”, “root ر-و-ح illustrates ... so we emphasize ...”). Capture that commentary either as additional descriptive text in comprehension/reflections or embedded inside the relevant passage layer description.
- MCQs should include 3–5 entries per group with full questions, options, and a clear correct answer.
- Maintain a short “methodology_summary” field (you may add inside comprehension or passage_layers) describing the overall strategy you used (context, verbs/nouns focus, grammar/roots emphasis).
Return ONLY valid JSON that matches the schema; do not wrap the JSON in markdown, explanations, or extra text.
`.trim();

  if (!payload.lesson) {
    throw new Error("Lesson payload is required");
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "structured-outputs-2025-11-13",
    },
    body: JSON.stringify({
      model,
      max_tokens,
      system: systemInstructions,
      messages: [{ role: "user", content: JSON.stringify(payload.lesson) }],
      output_format: {
        type: "json_schema",
        schema: ArabicLessonSchema,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude error ${res.status}: ${errText}`);
  }

  const data = await res.json().catch(() => null);

  const outputText = data?.content?.[0]?.text;
  if (!outputText) {
    throw new Error("No structured JSON returned in content[0].text");
  }

  const parseResult = parseClaudeLessonJson(outputText);
  if (!parseResult.ok) {
    return parseResult;
  }
  return { ok: true, lesson: parseResult.lesson, raw_output: parseResult.raw_output };
}
// Claude occasionally emits JSON that is missing quotes around property names,
// so try a sanitized pass before giving up.
type ClaudeLessonParseResult =
  | { ok: true; lesson: any; raw_output: string }
  | { ok: false; error: string; raw_output: string };

function parseClaudeLessonJson(outputText: string): ClaudeLessonParseResult {
  const attempts: { text: string; label: string }[] = [{ text: outputText, label: "raw" }];
  const sanitizedText = sanitizeJsonLikeString(outputText);
  if (sanitizedText !== outputText) {
    attempts.push({ text: sanitizedText, label: "sanitized" });
  }
  const recoveredText = recoverJsonStructure(sanitizedText);
  if (recoveredText !== sanitizedText) {
    attempts.push({ text: recoveredText, label: "recovered" });
  }

  let lastError: Error | null = null;
  for (const attempt of attempts) {
    try {
      return { ok: true, lesson: JSON.parse(attempt.text), raw_output: attempt.text };
    } catch (error: any) {
      lastError = error;
    }
  }

  const snippet = getSnippet(outputText);
  return {
    ok: false,
    error: `Failed to parse Claude output JSON after attempts (last error: ${lastError?.message ?? "unknown"}). Output snippet: ${snippet}`,
    raw_output: outputText,
  };
}

// Walk the text and quote keys that are not already wrapped, while respecting string literals.
function sanitizeJsonLikeString(input: string) {
  let result = "";
  let index = 0;
  let inString = false;
  let stringQuote = "";
  let escaping = false;

  while (index < input.length) {
    const char = input[index];

    if (inString) {
      result += char;
      if (escaping) {
        escaping = false;
      } else if (char === "\\") {
        escaping = true;
      } else if (char === stringQuote) {
        inString = false;
        stringQuote = "";
      }
      index++;
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      stringQuote = char;
      result += char;
      index++;
      continue;
    }

    if (char === "{" || char === ",") {
      result += char;
      const { chunk, nextIndex } = rewritePropertySegment(input, index + 1);
      result += chunk;
      index = nextIndex;
      continue;
    }

    result += char;
    index++;
  }

  return result;
}

function rewritePropertySegment(text: string, startIndex: number) {
  let index = startIndex;
  let chunk = "";

  while (index < text.length && /\s/.test(text[index])) {
    chunk += text[index];
    index++;
  }

  if (index >= text.length) {
    return { chunk, nextIndex: index };
  }

  const currentChar = text[index];
  if (currentChar === '"') {
    return { chunk, nextIndex: index };
  }

  if (currentChar === "'") {
    const { value, nextIndex } = readQuotedIdentifier(text, index, "'");
    let whitespace = "";
    let j = nextIndex;
    while (j < text.length && /\s/.test(text[j])) {
      whitespace += text[j];
      j++;
    }

    if (j < text.length && text[j] === ":") {
      chunk += `"${escapeDoubleQuotes(value)}"` + whitespace;
      return { chunk, nextIndex: j };
    }

    chunk += text.slice(index, nextIndex);
    return { chunk, nextIndex };
  }

  if (isIdentifierStart(currentChar)) {
    const nameStart = index;
    while (index < text.length && isIdentifierChar(text[index])) {
      index++;
    }

    const propertyName = text.slice(nameStart, index);
    let whitespace = "";
    let j = index;
    while (j < text.length && /\s/.test(text[j])) {
      whitespace += text[j];
      j++;
    }

    if (j < text.length && text[j] === ":") {
      chunk += `"${propertyName}"` + whitespace;
      return { chunk, nextIndex: j };
    }

    chunk += text.slice(nameStart, index);
    return { chunk, nextIndex: index };
  }

  return { chunk, nextIndex: index };
}

function readQuotedIdentifier(text: string, startIndex: number, quote: "'" | '"') {
  let index = startIndex + 1;
  let value = "";

  while (index < text.length) {
    const char = text[index];
    if (char === "\\") {
      if (index + 1 < text.length) {
        value += text[index + 1];
        index += 2;
        continue;
      }
    } else if (char === quote) {
      return { value, nextIndex: index + 1 };
    }

    value += char;
    index++;
  }

  return { value, nextIndex: index };
}

function isIdentifierStart(char: string) {
  return /[A-Za-z0-9_\-]/.test(char);
}

function isIdentifierChar(char: string) {
  return /[A-Za-z0-9_\-]/.test(char);
}

function escapeDoubleQuotes(value: string) {
  return value.replace(/"/g, '\\"');
}

function recoverJsonStructure(text: string) {
  let index = 0;
  let inString = false;
  let escaping = false;
  const stack: string[] = [];

  while (index < text.length) {
    const char = text[index];
    if (inString) {
      if (escaping) {
        escaping = false;
      } else if (char === "\\") {
        escaping = true;
      } else if (char === '"') {
        inString = false;
      }
      index++;
      continue;
    }

    if (char === '"') {
      inString = true;
      index++;
      continue;
    }

    if (char === "{") {
      stack.push("}");
    } else if (char === "[") {
      stack.push("]");
    } else if (char === "}" || char === "]") {
      if (stack.length && stack[stack.length - 1] === char) {
        stack.pop();
      }
    }

    index++;
  }

  let recovery = text;
  if (inString) {
    recovery += '"';
  }
  while (stack.length) {
    recovery += stack.pop();
  }
  return recovery;
}

function getSnippet(text: string) {
  const maxLength = 800;
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}
