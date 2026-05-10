'use client';

import { useState } from 'react';
import { AgentTrace } from '@/components/AgentTrace';
import { BookingPanel } from '@/components/BookingPanel';
import { ChatSimulator } from '@/components/ChatSimulator';
import { TestRunner } from '@/components/TestRunner';

export default function DemoPage() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([
    { role: 'agent', content: "Hi, I'm the club receptionist. I can help with bookings, pricing, lessons, events, and waivers." },
  ]);
  const [traces, setTraces] = useState<any[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMessage(text: string) {
    if (loading) return;

    setError(null);
    setMessages(prev => [...prev, { role: 'customer', content: text }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, clubId: 'demo', conversationId }),
      });
      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await res.json() : {};

      if (!res.ok) {
        throw new Error(data.error || 'Request failed');
      }

      if (!data.response) {
        throw new Error('Chat function returned an empty response');
      }

      setConversationId(data.conversationId);
      setMessages(prev => [...prev, { role: 'agent', content: data.response }]);
      if (data.trace) {
        setTraces(prev => [data.trace, ...prev]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown chat error';
      setError(message);
      setMessages(prev => [...prev, { role: 'agent', content: "I'm having trouble connecting to the demo function. The page stayed up so you can retry after the API is fixed." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-surface flex min-h-dvh flex-col text-[#15211b]">
      <header className="sticky top-0 z-20 border-b border-[#dce6d7] bg-[#fbfcf8]/90 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#153f2a] text-sm font-black text-white shadow-sm">PK</span>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold sm:text-lg">Pickle-Klaw Demo</h1>
              <p className="truncate text-xs text-[#667468]">Text simulator with trace, RAG, fake tools, and Neon logging</p>
            </div>
          </div>
          <nav className="flex shrink-0 items-center gap-3 text-xs">
            <a href="/dashboard" className="font-medium text-[#1b6b3a] hover:text-[#153f2a]">
              Dashboard
            </a>
            <a href="/clubs/demo" className="hidden text-[#667468] hover:text-[#15211b] sm:inline">
              Club
            </a>
          </nav>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatusCard label="Mode" value="Text MVP" detail="Voice later" />
          <StatusCard label="Database" value="Neon" detail="Logging enabled" />
          <StatusCard label="Model" value={traces[0]?.model || 'Template'} detail="Adapter ready" />
        </div>
        {error && (
          <div className="mt-3 rounded-lg border border-[#efb4b4] bg-[#fff0f0] px-3 py-2 text-sm text-[#8a2525]">
            API error: {error}
          </div>
        )}
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-2 sm:px-6">
        <TestRunner onSend={sendMessage} loading={loading} />
      </section>

      <div className="mx-auto grid min-h-0 w-full max-w-6xl flex-1 grid-rows-[minmax(0,1fr)_auto] gap-4 px-4 pb-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:grid-rows-1">
        <div className="control-ring min-h-[58dvh] min-w-0 overflow-hidden rounded-lg border border-[#dce6d7] bg-white">
          <ChatSimulator messages={messages} loading={loading} onSend={sendMessage} />
        </div>

        <aside className="control-ring max-h-[42dvh] overflow-y-auto rounded-lg border border-[#dce6d7] bg-[#f8fbf5] lg:max-h-none">
          <AgentTrace traces={traces} />
        </aside>
      </div>

      <BookingPanel trace={traces[0]} />
    </main>
  );
}

function StatusCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="soft-card rounded-lg p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6a7a6e]">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-[#15211b]">{value}</div>
      <div className="mt-0.5 text-xs text-[#667468]">{detail}</div>
    </div>
  );
}
