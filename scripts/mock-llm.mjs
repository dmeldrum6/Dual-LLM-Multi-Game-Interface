#!/usr/bin/env node
// A tiny OpenAI-compatible server for trying the app without a real model.
//   npm run mock            → http://localhost:4010/v1
// Models:
//   mock-player   picks a random legal move and chats with canned lines
//   mock-chaos    like mock-player, but sometimes answers with an illegal move
//   mock-thinker  wraps its answer in <think>…</think> first
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT) || 4010;
const MODELS = ['mock-player', 'mock-chaos', 'mock-thinker'];

const TALK = [
  "Let's see how you handle this.",
  'Bold of you. Here is my answer.',
  'I saw that coming three moves ago.',
  'Interesting… but not interesting enough.',
  'You will regret that.',
  'A calm, measured response.',
];
const LINES = [
  'That is a fair point, though I think it skips over the practical side.',
  'I would push back a little: the simplest design is rarely the most loved one.',
  'Consider how people actually use it day to day, not how we imagine they do.',
  'What would change your mind on this?',
  'There is a hidden cost here that nobody budgets for.',
  'I agree with the premise but not the conclusion.',
];
const PROSE = [
  'The stairs were colder than they had any right to be.',
  'Somewhere below, a bell rang once and then thought better of it.',
  'She counted the steps out loud, and on the forty-first her voice came back changed.',
  'The lamp above swung, though there was no wind.',
  'A door waited at the bottom, painted the exact blue of her childhood bedroom.',
  'He laughed, and the sound was the wrong shape.',
];

const pick = (a) => a[Math.floor(Math.random() * a.length)];

function answer(model, messages) {
  const last = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
  const system = messages.find((m) => m.role === 'system')?.content ?? '';
  const legal = last.match(/Your legal moves: ([^\n]+)/);
  let text;
  if (/judge/i.test(system)) {
    text = `Both sides argued well, but one rebuttal landed harder.\n\nWINNER: ${pick(['A', 'B', 'TIE'])}`;
  } else if (legal) {
    const moves = legal[1].split(/,\s*/).filter(Boolean);
    let move = pick(moves);
    if (model === 'mock-chaos' && Math.random() < 0.35) move = pick(['Zz9', 'Q9', 'K1x', 'pass']);
    text = `${pick(TALK)}\nMOVE: ${move}`;
  } else if (/co-writing/i.test(system)) {
    const n = Number(system.match(/exactly (\d+)/)?.[1] ?? 2);
    text = Array.from({ length: n }, () => pick(PROSE)).join(' ');
  } else {
    text = `${pick(LINES)} ${pick(LINES)}`;
  }
  if (model === 'mock-thinker') text = `<think>Let me weigh the options carefully. ${pick(LINES)}</think>\n${text}`;
  return text;
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return res.writeHead(204, cors).end();
  const url = new URL(req.url, 'http://x');
  if (req.method === 'GET' && url.pathname === '/v1/models') {
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ object: 'list', data: MODELS.map((id) => ({ id, object: 'model' })) }));
  }
  if (req.method === 'POST' && url.pathname === '/v1/chat/completions') {
    let body = '';
    for await (const chunk of req) body += chunk;
    const { model, messages, stream } = JSON.parse(body || '{}');
    const text = answer(model, messages ?? []);
    const usage = { prompt_tokens: Math.ceil(JSON.stringify(messages).length / 4), completion_tokens: Math.ceil(text.length / 4) };
    usage.total_tokens = usage.prompt_tokens + usage.completion_tokens;
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 400));
    if (!stream) {
      res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }], usage }));
    }
    res.writeHead(200, { ...cors, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
    for (const piece of text.match(/\S+\s*|\s+/g) ?? []) {
      res.write(`data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: piece } }] })}\n\n`);
      await new Promise((r) => setTimeout(r, 25));
    }
    res.write(`data: ${JSON.stringify({ choices: [], usage })}\n\n`);
    return res.end('data: [DONE]\n\n');
  }
  res.writeHead(404, cors).end();
}).listen(PORT, () => console.log(`Mock LLM server on http://localhost:${PORT}/v1 (models: ${MODELS.join(', ')})`));
