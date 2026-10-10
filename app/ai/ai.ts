import { QuizQuestion } from "../../config/schema";

export type CourseOutline = {
  title: string;
  description: string;
  level: "beginner" | "intermediate" | "advanced";
  estimatedHours: number;
  chapters: {
    order: number;
    title: string;
    description: string;
    durationMinutes: number;
    youtubeSearchQuery: string;
  }[];
};

export type Flashcard = {
  front: string;
  back: string;
};

type ProviderError = {
  status: number;
  message: string;
  retryAfterMs?: number;
};

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

function getRetryAfterMs(res: Response): number | undefined {
  const retryAfter = res.headers.get("retry-after");

  if (!retryAfter) return undefined;

  const seconds = Number(retryAfter);

  if (!Number.isNaN(seconds)) {
    return seconds * 1000;
  }

  const date = Date.parse(retryAfter);

  if (!Number.isNaN(date)) {
    return Math.max(0, date - Date.now());
  }

  return undefined;
}

function isRetryable(status: number) {
  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  provider: string,
  model: string,
  maxRetries = 2
): Promise<Response> {
  let lastError: ProviderError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, options);

    if (res.ok) {
      return res;
    }

    const errorText = await res.text();

    lastError = {
      status: res.status,
      message: errorText,
      retryAfterMs: getRetryAfterMs(res),
    };

    // Permanent auth / permission / bad-request errors: don't retry.
    if (!isRetryable(res.status)) {
      throw lastError;
    }

    if (attempt === maxRetries) {
      throw lastError;
    }

    const exponentialDelay = 1500 * Math.pow(2, attempt);

    const delay = Math.min(lastError.retryAfterMs ?? exponentialDelay, 30000);

    console.warn(
      `[AI] ${provider}/${model} returned ${res.status}. ` +
        `Retrying in ${Math.round(delay / 1000)}s...`
    );

    await sleep(delay);
  }

  throw (
    lastError ?? {
      status: 500,
      message: `${provider}/${model} failed without a response.`,
    }
  );
}

// ─── JSON Parsing ─────────────────────────────────────────────────────────────
//
// Strips <think> blocks and code fences, then extracts the outermost
// { ... } so stray text before/after the JSON doesn't break parsing.

function safeParseJSON<T>(raw: string): T {
  const cleaned = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end <= start) {
    throw new Error(`AI returned no JSON: ${cleaned.slice(0, 300)}`);
  }

  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    throw new Error(`AI returned invalid JSON: ${cleaned.slice(0, 300)}`);
  }
}

// ─── OpenRouter ───────────────────────────────────────────────────────────────
//
// All generation runs through OpenRouter free-tier models. We try candidates
// in order and fall through to the next on 429 / 404 / 5xx / empty response /
// unparseable output.
// See: https://openrouter.ai/models?q=free  (check IDs; free models change often)

const OPENROUTER_MODEL_CANDIDATES = Array.from(
  new Set(
    [
      process.env.OPENROUTER_MODEL,
      "nvidia/nemotron-3-super-120b-a12b:free",
      "nvidia/nemotron-3.5-lightning:free",
      "openrouter/free", // catch-all, last
    ].filter(Boolean)
  )
) as string[];

async function callAI<T>(
  systemPrompt: string,
  userPrompt: string,
  parse: (raw: string) => T,
  maxTokens = 2500
): Promise<T> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Get a free key at https://openrouter.ai/keys"
    );
  }

  let lastError = "No error detail.";

  for (const model of OPENROUTER_MODEL_CANDIDATES) {
    try {
      // maxRetries = 0: on 429 move to the next model immediately
      // instead of waiting on a model that is already exhausted.
      const res = await fetchWithRetry(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000",
            "X-Title": process.env.APP_NAME ?? "AI Course Generator",
          },
          body: JSON.stringify({
            model,
            temperature: 0.7,
            max_tokens: maxTokens,
            // Stop reasoning tokens from eating the whole budget.
            reasoning: { enabled: false },
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          }),
        },
        "OpenRouter",
        model,
        0
      );

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error(`${model} returned an empty response.`);
      }

      // Parsing happens INSIDE the loop, so a bad response
      // falls through to the next model.
      return parse(content);
    } catch (error) {
      const e = error as ProviderError;

      lastError =
        e?.message ??
        (error instanceof Error ? error.message : String(error));

      console.warn(`[AI] ${model} failed (${e?.status ?? "parse/empty"}).`);

      // Auth/config errors will fail on every model, so stop.
      if (e?.status === 401 || e?.status === 403) {
        break;
      }
    }
  }

  throw new Error(`All OpenRouter models failed.\n${lastError}`);
}

// ─── Course Outline ───────────────────────────────────────────────────────────

export async function generateCourseOutline(
  topic: string
): Promise<CourseOutline> {
  const system = `
You are an expert curriculum designer.

Always respond with valid JSON only.
Do not include markdown fences or any text outside the JSON.
`;

  const user = `
Create a comprehensive course outline for: "${topic}"

Return ONLY a JSON object:

{
  "title": "Full course title",
  "description": "2-3 sentence course overview",
  "level": "beginner",
  "estimatedHours": 10,
  "chapters": [
    {
      "order": 1,
      "title": "Chapter title",
      "description": "What this chapter covers in 1-2 sentences",
      "durationMinutes": 20,
      "youtubeSearchQuery": "specific search query"
    }
  ]
}

Requirements:
- 6 to 8 chapters
- Progress logically from fundamentals to advanced concepts
- Each chapter must have a useful description
- youtubeSearchQuery must be specific
`;

  return callAI(system, user, (raw) => safeParseJSON<CourseOutline>(raw));
}

// ─── Lesson Content ───────────────────────────────────────────────────────────

export async function generateLessonContent(
  courseTitle: string,
  chapterTitle: string,
  chapterDescription: string
): Promise<string> {
  const system = `
You are an expert educator writing clear, engaging lesson content.

Always respond with valid JSON only. No text outside the JSON.

Do NOT use triple backtick code fences inside JSON strings.
For code examples, use indentation and label them with "Example:".
Escape newlines as \\n and double quotes as \\" inside the JSON string.
`;

  const user = `
Write lesson content for:

Course: "${courseTitle}"
Chapter: "${chapterTitle}"
Description: "${chapterDescription}"

Return ONLY:

{
  "content": "Full lesson in plain markdown."
}

Include:
- Introduction
- Key concepts
- Practical examples
- Key takeaways

Target length: 400-600 words.
`;

  // Lessons are long, so give them a bigger token budget.
  return callAI(
    system,
    user,
    (raw) => {
      const parsed = safeParseJSON<{ content: string }>(raw);
      if (!parsed?.content || typeof parsed.content !== "string") {
        throw new Error("Lesson JSON missing 'content'.");
      }
      return parsed.content;
    },
    4000
  );
}

// ─── Quiz Questions ───────────────────────────────────────────────────────────

export async function generateQuizQuestions(
  chapterTitle: string,
  lessonContent: string
): Promise<QuizQuestion[]> {
  const system = `
You are an expert educational assessment designer.

Always respond with valid JSON only. No text outside the JSON.
`;

  const user = `
Create quiz questions for:

"${chapterTitle}"

Based on:

${lessonContent.slice(0, 1500)}

Return ONLY:

{
  "questions": [
    {
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "Why this is correct."
    }
  ]
}

Requirements:
- Exactly 4 questions
- Exactly 4 options per question
- correctIndex must be 0, 1, 2, or 3
- Questions must test understanding, not trivial wording
`;

  return callAI(system, user, (raw) => {
    const parsed = safeParseJSON<{ questions: QuizQuestion[] }>(raw);
    if (!Array.isArray(parsed?.questions) || parsed.questions.length === 0) {
      throw new Error("Quiz JSON missing 'questions'.");
    }
    return parsed.questions;
  });
}

// ─── Flashcards ───────────────────────────────────────────────────────────────

export async function generateFlashcards(
  chapterTitle: string,
  lessonContent: string
): Promise<Flashcard[]> {
  const system = `
You are an expert at creating educational flashcards.

Always respond with valid JSON only. No text outside the JSON.
`;

  const user = `
Create flashcards for:

"${chapterTitle}"

Based on:

${lessonContent.slice(0, 1500)}

Return ONLY:

{
  "flashcards": [
    {
      "front": "Term or question",
      "back": "Definition or answer"
    }
  ]
}

Requirements:
- Exactly 6 flashcards
- Cover the most important concepts
- Keep fronts short
- Keep answers to 1-2 sentences
`;

  return callAI(system, user, (raw) => {
    const parsed = safeParseJSON<{ flashcards: Flashcard[] }>(raw);
    if (!Array.isArray(parsed?.flashcards) || parsed.flashcards.length === 0) {
      throw new Error("Flashcard JSON missing 'flashcards'.");
    }
    return parsed.flashcards;
  });
}