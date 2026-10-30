// User settings, persisted to localStorage. API keys are only saved when the
// user opts in.

import { effect, signal } from '@preact/signals';
import type { Player, Side } from '../engine/types';

export interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  needsKey: boolean;
}

export const PROVIDERS: Provider[] = [
  { id: 'lmstudio', name: 'LM Studio', baseUrl: 'http://localhost:1234/v1', needsKey: false },
  { id: 'ollama', name: 'Ollama', baseUrl: 'http://localhost:11434/v1', needsKey: false },
  { id: 'llamacpp', name: 'llama.cpp server', baseUrl: 'http://localhost:8080/v1', needsKey: false },
  { id: 'vllm', name: 'vLLM', baseUrl: 'http://localhost:8000/v1', needsKey: false },
  { id: 'jan', name: 'Jan', baseUrl: 'http://localhost:1337/v1', needsKey: false },
  { id: 'koboldcpp', name: 'KoboldCpp', baseUrl: 'http://localhost:5001/v1', needsKey: false },
  { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', needsKey: true },
  { id: 'openrouter', name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', needsKey: true },
  { id: 'groq', name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', needsKey: true },
  { id: 'mock', name: 'Mock server (npm run mock)', baseUrl: 'http://localhost:4010/v1', needsKey: false },
];

export const PERSONAS: { label: string; text: string }[] = [
  { label: 'Trash talker', text: 'A cocky, theatrical showboat who loves playful trash talk.' },
  { label: 'Zen master', text: 'A calm, cryptic sage who speaks in short koans.' },
  { label: 'Pirate', text: 'A swashbuckling pirate captain. Arr.' },
  { label: 'Sports commentator', text: 'An over-excited sports commentator narrating your own every move.' },
  { label: 'Shakespearean', text: 'A dramatic Elizabethan actor who speaks in flowery verse.' },
  { label: 'Grumpy professor', text: 'A grumpy, pedantic professor who is mildly disappointed in everyone.' },
];

export const defaultPlayer = (): Player => ({
  name: '',
  persona: '',
  baseUrl: PROVIDERS[0].baseUrl,
  apiKey: '',
  model: '',
  temperature: 0.7,
  maxTokens: null,
  stream: true,
});

export type Theme = 'system' | 'light' | 'dark';

const KEY = 'dllm.v2';

interface Saved {
  players: [Player, Player];
  rememberKeys: boolean;
  gameId: string;
  setups: Record<string, any>;
  pace: number;
  theme: Theme;
  sidebarOpen: boolean;
}

function load(): Partial<Saved> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

const saved = load();

export const players = signal<[Player, Player]>([
  { ...defaultPlayer(), ...saved.players?.[0] },
  { ...defaultPlayer(), ...saved.players?.[1] },
]);
export const rememberKeys = signal(saved.rememberKeys ?? false);
export const gameId = signal(saved.gameId ?? 'chess');
export const setups = signal<Record<string, any>>(saved.setups ?? {});
export const pace = signal(saved.pace ?? 1200);
export const theme = signal<Theme>(saved.theme ?? 'system');
export const sidebarOpen = signal(saved.sidebarOpen ?? true);

effect(() => {
  const data: Saved = {
    players: players.value.map((p) => (rememberKeys.value ? p : { ...p, apiKey: '' })) as [Player, Player],
    rememberKeys: rememberKeys.value,
    gameId: gameId.value,
    setups: setups.value,
    pace: pace.value,
    theme: theme.value,
    sidebarOpen: sidebarOpen.value,
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable */
  }
});

effect(() => {
  const t = theme.value;
  const root = document.documentElement;
  if (t === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', t);
});

export function updatePlayer(side: Side, patch: Partial<Player>) {
  const next = [...players.value] as [Player, Player];
  next[side] = { ...next[side], ...patch };
  players.value = next;
}

export function displayName(p: Player, side: Side): string {
  return p.name.trim() || p.model.trim().split('/').pop() || `Player ${side === 0 ? 'A' : 'B'}`;
}

/** Players with display names filled in, as handed to a session. */
export function resolvedPlayers(): [Player, Player] {
  const [a, b] = players.value;
  let na = displayName(a, 0);
  let nb = displayName(b, 1);
  if (na === nb) {
    na += ' (A)';
    nb += ' (B)';
  }
  return [{ ...a, name: na }, { ...b, name: nb }];
}
