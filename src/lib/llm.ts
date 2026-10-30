// OpenAI-compatible chat client: streaming, cancellation, retries, and
// separation of "thinking" from the visible answer.

export interface Connection {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number | null;
  maxTokens: number | null;
  stream: boolean;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  content: string;
  reasoning: string;
  promptTokens: number;
  completionTokens: number;
  estimated: boolean;
  ms: number;
}

export interface ChatOptions {
  signal: AbortSignal;
  /** Called with the full text and reasoning received so far. */
  onProgress?: (content: string, reasoning: string) => void;
}

export class ApiError extends Error {
  constructor(message: string, readonly retryable = false) {
    super(message);
  }
}

/** Accepts either a base URL or a full /chat/completions URL. */
export function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '').replace(/\/chat\/completions$/, '');
}

function headers(conn: Connection): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (conn.apiKey.trim()) h.Authorization = `Bearer ${conn.apiKey.trim()}`;
  return h;
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const t = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(signal!.reason);
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

function networkError(conn: Connection, err: unknown): ApiError {
  const base = normalizeBaseUrl(conn.baseUrl);
  const local = /localhost|127\.0\.0\.1|0\.0\.0\.0|\.local\b|192\.168\./.test(base);
  const hint = local
    ? 'Is the server running, and is CORS enabled? (LM Studio: Developer → Server Settings → Enable CORS. Ollama: set OLLAMA_ORIGINS.)'
    : 'The server may be unreachable or may block browser requests (CORS).';
  return new ApiError(`Could not reach ${base}. ${hint} (${(err as Error)?.message ?? err})`, true);
}

/** GET {base}/models and return the model ids. */
export async function listModels(conn: Connection, signal?: AbortSignal): Promise<string[]> {
  let res: Response;
  try {
    res = await fetch(`${normalizeBaseUrl(conn.baseUrl)}/models`, { headers: headers(conn), signal });
  } catch (err) {
    if (isAbort(err)) throw err;
    throw networkError(conn, err);
  }
  if (!res.ok) throw new ApiError(`Model list failed: HTTP ${res.status}`);
  const data = await res.json();
  const list: unknown[] = Array.isArray(data?.data) ? data.data : Array.isArray(data?.models) ? data.models : [];
  return list
    .map((m: any) => (typeof m === 'string' ? m : m?.id ?? m?.name))
    .filter((id): id is string => typeof id === 'string')
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Split inline reasoning (<think>…</think>, used by DeepSeek-R1, Qwen3 and
 * similar) from the visible answer. Handles an unclosed tag while streaming.
 */
export function splitThinking(text: string): { answer: string; thinking: string } {
  const thinking: string[] = [];
  let answer = text.replace(/<(think|thinking|reasoning)>([\s\S]*?)<\/\1>/gi, (_, __, inner) => {
    thinking.push(inner.trim());
    return '';
  });
  const open = answer.search(/<(think|thinking|reasoning)>/i);
  if (open !== -1) {
    thinking.push(answer.slice(open).replace(/^<[^>]+>/, '').trim());
    answer = answer.slice(0, open);
  }
  // Some templates emit only the closing tag (the opening one is in the prompt).
  const close = answer.search(/<\/(think|thinking|reasoning)>/i);
  if (close !== -1) {
    thinking.push(answer.slice(0, close).trim());
    answer = answer.slice(close).replace(/^<\/[^>]+>/, '');
  }
  return { answer: answer.trim(), thinking: thinking.filter(Boolean).join('\n\n') };
}

const estimateTokens = (s: string) => Math.ceil(s.length / 4);

async function readError(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  try {
    const j = JSON.parse(text);
    return j?.error?.message ?? j?.message ?? j?.error ?? text;
  } catch {
    return text.slice(0, 300) || res.statusText;
  }
}

async function attempt(conn: Connection, messages: ChatMessage[], opts: ChatOptions, stream: boolean): Promise<ChatResult> {
  const started = performance.now();
  const body: Record<string, unknown> = { model: conn.model, messages, stream };
  if (conn.temperature !== null) body.temperature = conn.temperature;
  if (conn.maxTokens) body.max_tokens = conn.maxTokens;
  if (stream) body.stream_options = { include_usage: true };

  let res: Response;
  try {
    res = await fetch(`${normalizeBaseUrl(conn.baseUrl)}/chat/completions`, {
      method: 'POST',
      headers: headers(conn),
      body: JSON.stringify(body),
      signal: opts.signal,
    });
  } catch (err) {
    if (isAbort(err)) throw err;
    throw networkError(conn, err);
  }

  if (!res.ok) {
    const msg = await readError(res);
    const err = new ApiError(`HTTP ${res.status}: ${msg}`, res.status === 429 || res.status >= 500);
    (err as any).status = res.status;
    (err as any).retryAfter = Number(res.headers.get('Retry-After')) || 0;
    throw err;
  }

  let content = '';
  let reasoning = '';
  let usage: any = null;

  const isStream = stream && (res.headers.get('content-type') ?? '').includes('text/event-stream');
  if (isStream && res.body) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') continue;
        let chunk: any;
        try {
          chunk = JSON.parse(payload);
        } catch {
          continue;
        }
        if (chunk.error) throw new ApiError(chunk.error.message ?? String(chunk.error));
        if (chunk.usage) usage = chunk.usage;
        const delta = chunk.choices?.[0]?.delta ?? {};
        if (typeof delta.content === 'string') content += delta.content;
        const r = delta.reasoning_content ?? delta.reasoning;
        if (typeof r === 'string') reasoning += r;
        opts.onProgress?.(content, reasoning);
      }
    }
  } else {
    const data = await res.json();
    const msg = data.choices?.[0]?.message ?? {};
    content = typeof msg.content === 'string' ? msg.content : '';
    reasoning = msg.reasoning_content ?? msg.reasoning ?? '';
    usage = data.usage ?? null;
    opts.onProgress?.(content, reasoning);
  }

  const split = splitThinking(content);
  const allReasoning = [reasoning.trim(), split.thinking].filter(Boolean).join('\n\n');
  const promptText = messages.map((m) => m.content).join('\n');
  return {
    content: split.answer,
    reasoning: allReasoning,
    promptTokens: usage?.prompt_tokens ?? estimateTokens(promptText),
    completionTokens: usage?.completion_tokens ?? estimateTokens(content + reasoning),
    estimated: !usage,
    ms: performance.now() - started,
  };
}

/** Chat completion with retries for network errors, 429 and 5xx. */
export async function chat(conn: Connection, messages: ChatMessage[], opts: ChatOptions): Promise<ChatResult> {
  if (!conn.model.trim()) throw new ApiError('No model selected.');
  let stream = conn.stream;
  let lastErr: unknown;
  for (let i = 0; i < 3; i++) {
    try {
      return await attempt(conn, messages, opts, stream);
    } catch (err) {
      if (isAbort(err)) throw err;
      lastErr = err;
      const status = (err as any).status as number | undefined;
      // Some servers reject stream_options or streaming; fall back once.
      if (stream && (status === 400 || status === 422)) {
        stream = false;
        continue;
      }
      if (!(err instanceof ApiError) || !err.retryable) throw err;
      const wait = ((err as any).retryAfter || 2 ** i) * 1000;
      await sleep(wait, opts.signal);
    }
  }
  throw lastErr;
}
