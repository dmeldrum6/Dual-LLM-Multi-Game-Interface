import { useEffect, useRef, useState } from 'preact/hooks';
import { Check, ChevronDown, CircleAlert, Plug, RefreshCw } from 'lucide-preact';
import { listModels, normalizeBaseUrl } from '../lib/llm';
import { displayName, PERSONAS, players, PROVIDERS, updatePlayer } from '../lib/settings';
import type { Side } from '../engine/types';

interface Props {
  side: Side;
  sideLabel: string;
  locked: boolean;
}

type Probe = { state: 'idle' | 'loading' | 'ok' | 'error'; message?: string };

export function PlayerCard({ side, sideLabel, locked }: Props) {
  const p = players.value[side];
  const [models, setModels] = useState<string[]>([]);
  const [probe, setProbe] = useState<Probe>({ state: 'idle' });
  const [open, setOpen] = useState(true);
  const abort = useRef<AbortController | null>(null);

  const provider = PROVIDERS.find((x) => normalizeBaseUrl(x.baseUrl) === normalizeBaseUrl(p.baseUrl));
  const isLocal = /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(p.baseUrl);
  const showKey = provider ? provider.needsKey : !isLocal;
  const set = (patch: Parameters<typeof updatePlayer>[1]) => updatePlayer(side, patch);

  async function refresh(quiet = false) {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setProbe({ state: 'loading' });
    try {
      const list = await listModels(players.value[side], ctrl.signal);
      setModels(list);
      setProbe({ state: 'ok', message: `${list.length} model${list.length === 1 ? '' : 's'} available` });
      if (!players.value[side].model && list.length) set({ model: list[0] });
    } catch (err) {
      if (ctrl.signal.aborted) return;
      setModels([]);
      setProbe(quiet ? { state: 'idle' } : { state: 'error', message: (err as Error).message });
    }
  }

  // Load the model list quietly whenever the server changes.
  useEffect(() => {
    const t = setTimeout(() => refresh(true), 400);
    return () => clearTimeout(t);
  }, [p.baseUrl, p.apiKey]);

  return (
    <section class={`card player player-${side === 0 ? 'a' : 'b'}`}>
      <header class="player-head" onClick={() => setOpen(!open)}>
        <span class="avatar" aria-hidden="true">{side === 0 ? 'A' : 'B'}</span>
        <div class="player-title">
          <strong>{displayName(p, side)}</strong>
          <span class="muted small">{sideLabel}{p.model ? ` · ${p.model}` : ''}</span>
        </div>
        <ChevronDown class={`chev ${open ? 'open' : ''}`} size={18} aria-label={open ? 'Collapse' : 'Expand'} />
      </header>

      {open && (
        <fieldset class="player-body" disabled={locked}>
          <label class="field">
            <span>Display name</span>
            <input value={p.name} placeholder={p.model || `Player ${side === 0 ? 'A' : 'B'}`} onInput={(e) => set({ name: e.currentTarget.value })} />
          </label>

          <label class="field">
            <span>Server</span>
            <select
              value={provider?.id ?? 'custom'}
              onChange={(e) => {
                const pr = PROVIDERS.find((x) => x.id === e.currentTarget.value);
                if (pr) set({ baseUrl: pr.baseUrl, model: '' });
              }}
            >
              {PROVIDERS.map((pr) => (
                <option value={pr.id}>{pr.name}</option>
              ))}
              <option value="custom">Custom…</option>
            </select>
          </label>

          <label class="field">
            <span>Base URL</span>
            <input value={p.baseUrl} spellcheck={false} onChange={(e) => set({ baseUrl: normalizeBaseUrl(e.currentTarget.value) })} />
          </label>

          {showKey && (
            <label class="field">
              <span>API key</span>
              <input type="password" value={p.apiKey} placeholder="sk-…" autocomplete="off" onInput={(e) => set({ apiKey: e.currentTarget.value })} />
            </label>
          )}

          <label class="field">
            <span>Model</span>
            <div class="row">
              {models.length ? (
                <select value={models.includes(p.model) ? p.model : '__custom'} onChange={(e) => e.currentTarget.value !== '__custom' && set({ model: e.currentTarget.value })}>
                  {!models.includes(p.model) && <option value="__custom">{p.model || 'Choose a model…'}</option>}
                  {models.map((m) => (
                    <option value={m}>{m}</option>
                  ))}
                </select>
              ) : (
                <input value={p.model} placeholder="model id, e.g. qwen2.5-7b-instruct" spellcheck={false} onInput={(e) => set({ model: e.currentTarget.value })} />
              )}
              <button type="button" class="icon-btn" title="Test connection and reload models" onClick={() => refresh()}>
                {probe.state === 'loading' ? <RefreshCw size={16} class="spin" /> : <Plug size={16} />}
              </button>
            </div>
          </label>
          {probe.state === 'ok' && (
            <p class="probe ok">
              <Check size={14} /> Connected · {probe.message}
            </p>
          )}
          {probe.state === 'error' && (
            <p class="probe err">
              <CircleAlert size={14} /> {probe.message}
            </p>
          )}

          <label class="field">
            <span>Persona <em class="muted">(optional — flavours table talk)</em></span>
            <textarea rows={2} value={p.persona} placeholder="e.g. a cocky grandmaster who loves trash talk" onInput={(e) => set({ persona: e.currentTarget.value })} />
          </label>
          <div class="chips">
            {PERSONAS.map((x) => (
              <button type="button" class={`chip ${p.persona === x.text ? 'on' : ''}`} onClick={() => set({ persona: p.persona === x.text ? '' : x.text })}>
                {x.label}
              </button>
            ))}
          </div>

          <details class="advanced">
            <summary>Advanced</summary>
            <label class="field">
              <span>
                Temperature <em class="muted">{p.temperature ?? 'server default'}</em>
              </span>
              <input type="range" min={0} max={1.5} step={0.05} value={p.temperature ?? 0.7} onInput={(e) => set({ temperature: Number(e.currentTarget.value) })} />
            </label>
            <label class="field">
              <span>Max tokens <em class="muted">(blank = no limit)</em></span>
              <input
                type="number"
                min={16}
                value={p.maxTokens ?? ''}
                placeholder="no limit"
                onInput={(e) => set({ maxTokens: e.currentTarget.value ? Number(e.currentTarget.value) : null })}
              />
            </label>
            <label class="check">
              <input type="checkbox" checked={p.stream} onChange={(e) => set({ stream: e.currentTarget.checked })} />
              Stream responses
            </label>
          </details>
        </fieldset>
      )}
    </section>
  );
}
