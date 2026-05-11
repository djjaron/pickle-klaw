'use client';

import { useState, useEffect } from 'react';

interface KnowledgeChunk {
  id?: string;
  category: string;
  content: string;
  createdAt?: string;
  source?: string;
}

interface KnowledgeManagerProps {
  clubId: string;
}

export function KnowledgeManager({ clubId }: KnowledgeManagerProps) {
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('custom');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const categories = ['hours', 'pricing', 'courts', 'rules', 'coaching', 'amenities', 'events', 'membership', 'location', 'custom'];

  useEffect(() => {
    fetchChunks();
  }, []);

  async function fetchChunks() {
    try {
      const res = await fetch(`/api/knowledge?clubId=${clubId}`);
      const data = await res.json();
      setChunks(data.chunks || []);
    } catch {
      setChunks([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    const text = content.trim();
    if (!text) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, category, clubId }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage('Knowledge added! Agent can now use this.');
        setContent('');
        setChunks(prev => [data.chunk || { category, content: text }, ...prev]);
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="soft-card rounded-lg p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Knowledge Upload</h2>
          <p className="mt-0.5 text-xs text-[#667468]">
            Add facts the AI agent can reference in conversations.
          </p>
        </div>
        <span className="rounded-md border border-[#b8dfc4] bg-[#dff8e8] px-2 py-1 text-[11px] font-semibold text-[#1b6b3a]">
          RAG
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="rounded-md border border-[#cdd9c8] bg-white px-3 py-1.5 text-xs text-[#15211b] focus:border-[#2f9b5f] focus:outline-none focus:ring-2 focus:ring-[#b7f3d0]"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Paste a knowledge chunk here — e.g. &quot;Private pickleball lessons are $80/hour with our PPR certified coach.&quot;"
          rows={3}
          className="w-full rounded-lg border border-[#cdd9c8] bg-white px-3 py-2 text-sm text-[#15211b] placeholder:text-[#8a968c] focus:border-[#2f9b5f] focus:outline-none focus:ring-2 focus:ring-[#b7f3d0]"
        />

        <div className="flex items-center gap-3">
          <button
            onClick={handleAdd}
            disabled={saving || !content.trim()}
            className="rounded-lg bg-[#153f2a] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#1e5b3d] disabled:opacity-30"
          >
            {saving ? 'Saving...' : 'Add Knowledge'}
          </button>
          {message && (
            <span className={`text-xs ${message.startsWith('Error') ? 'text-[#9d3030]' : 'text-[#1b6b3a]'}`}>
              {message}
            </span>
          )}
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#6a7a6e]">
            {loading ? 'Loading...' : `${chunks.length} chunks`}
          </h3>
        </div>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {chunks.length === 0 && !loading ? (
            <p className="py-3 text-center text-xs text-[#98a39a]">No custom knowledge yet. Add one above.</p>
          ) : (
            chunks.slice(0, 20).map((chunk, i) => (
              <div key={chunk.id || i} className="rounded-md border border-[#dfe7da] bg-[#f8fbf5] px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="shrink-0 rounded bg-[#eef3eb] px-1.5 py-0.5 text-[10px] font-semibold text-[#526256]">
                    {chunk.category}
                  </span>
                  {chunk.source && (
                    <span className="text-[9px] text-[#98a39a]">{chunk.source}</span>
                  )}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[#536356] line-clamp-3">{chunk.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
