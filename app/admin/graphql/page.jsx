'use client';

import { useEffect, useState } from 'react';
import { runGraphQL, fetchGraphQLSchema, listContentModels } from '../../../lib/api';

const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);

export default function GraphQLPage() {
  const [query, setQuery] = useState('{\n  contentModels {\n    apiName\n    name\n  }\n}');
  const [variables, setVariables] = useState('');
  const [useToken, setUseToken] = useState(false);
  const [result, setResult] = useState('');
  const [statusLine, setStatusLine] = useState('');
  const [running, setRunning] = useState(false);
  const [models, setModels] = useState([]);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
    listContentModels().then(setModels).catch(() => {});
  }, []);

  async function run() {
    setRunning(true);
    setStatusLine('');
    try {
      let vars;
      if (variables.trim()) vars = JSON.parse(variables);
      const { status, json } = await runGraphQL({ query, variables: vars, useToken });
      setStatusLine(`HTTP ${status}${useToken ? ' · sent with your admin token' : ' · anonymous (public)'}`);
      setResult(JSON.stringify(json, null, 2));
    } catch (err) {
      setStatusLine('Error');
      setResult(err.message.includes('JSON') ? 'The variables box is not valid JSON.' : err.message);
    } finally {
      setRunning(false);
    }
  }

  async function showSchema() {
    setStatusLine('Schema (SDL) — public');
    setResult(await fetchGraphQLSchema());
  }

  function sampleFor(m) {
    const l = lowerFirst(m.apiName);
    const fields = m.fields.filter((f) => f.type !== 'reference').slice(0, 4).map((f) => `      ${f.name}`).join('\n');
    return `{\n  ${l}List(limit: 10) {\n    total\n    items {\n      _path\n      _status\n${fields}\n    }\n  }\n}`;
  }

  const box = 'w-full border border-hairline bg-paper font-mono text-xs p-3 outline-none focus:border-ink';

  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      <h1 className="font-display text-2xl font-bold text-ink">GraphQL</h1>
      <p className="text-sm text-slate mt-1 max-w-3xl">
        Queries are <strong>public</strong> (published fragments only). Mutations — create, update, delete — need a
        Bearer token. Tick “Send my admin token” to test as an authenticated client (drafts become visible too).
      </p>

      <div className="mt-4 border border-hairline bg-paper p-4 text-xs font-mono text-slate space-y-1 overflow-x-auto">
        <div>Endpoint: <span className="text-ink">{origin}/api/graphql</span> &nbsp;·&nbsp; Schema: <span className="text-ink">{origin}/api/graphql/schema</span></div>
        <div>curl -X POST {origin}/api/graphql -H &quot;Content-Type: application/json&quot; -d &apos;{'{"query":"{ contentModels { apiName } }"}'}&apos;</div>
        <div>curl -G {origin}/api/graphql --data-urlencode &apos;query={'{ contentModels { apiName } }'}&apos;</div>
      </div>

      <div className="mt-6 grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate">Samples:</span>
            {models.map((m) => (
              <button key={m.id} onClick={() => setQuery(sampleFor(m))} className="text-signal hover:underline">
                {lowerFirst(m.apiName)}List
              </button>
            ))}
          </div>
          <textarea value={query} onChange={(e) => setQuery(e.target.value)} rows={16} spellCheck={false} className={box} />
          <div>
            <label className="block text-xs text-slate mb-1">Variables (JSON, optional)</label>
            <textarea value={variables} onChange={(e) => setVariables(e.target.value)} rows={4} spellCheck={false} className={box} />
          </div>
          <div className="flex items-center gap-4">
            <button onClick={run} disabled={running} className="bg-ink text-paper px-5 py-2.5 text-sm font-medium hover:bg-signal transition-colors disabled:opacity-60">
              {running ? 'Running…' : 'Run'}
            </button>
            <button onClick={showSchema} className="text-sm border border-ink px-4 py-2.5 hover:bg-ink hover:text-paper transition-colors">
              Show schema
            </button>
            <label className="flex items-center gap-2 text-sm text-slate">
              <input type="checkbox" checked={useToken} onChange={(e) => setUseToken(e.target.checked)} />
              Send my admin token
            </label>
          </div>
        </div>

        <div>
          <div className="text-xs text-slate mb-1 h-4">{statusLine}</div>
          <pre className={`${box} h-[34rem] overflow-auto whitespace-pre`}>{result || 'Results appear here.'}</pre>
        </div>
      </div>
    </div>
  );
}
