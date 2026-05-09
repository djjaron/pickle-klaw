'use client';

import { useState, useRef, useEffect } from 'react';
import { AgentTrace } from '@/components/AgentTrace';
import { ChatSimulator } from '@/components/ChatSimulator';

export default function DemoPage() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([
    { role: 'agent', content: "Hi! I'm the pickleball club receptionist. How can I help you? You can ask about court bookings, pricing, lessons, events, waivers — anything!" },
  ]);
  const [traces, setTraces] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function sendMessage(text: string) {
    setMessages(prev => [...prev, { role: 'customer', content: text }]);
    setLoading(true);

    try {
      const res = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, clubId: 'demo-club' }),
      });
      const data = await res.json();

      setMessages(prev => [...prev, { role: 'agent', content: data.response }]);
      setTraces(prev => [data.trace, ...prev]);
    } catch {
      setMessages(prev => [...prev, { role: 'agent', content: "I'm having trouble connecting. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#0a0a0a] text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎾</span>
          <div>
            <h1 className="text-lg font-bold">Pickle-Klaw Demo</h1>
            <p className="text-xs text-white/30">AI receptionist simulator</p>
          </div>
        </div>
        <a href="/dashboard" className="text-xs text-brand-400 hover:text-brand-300">
          Dashboard →
        </a>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Chat Panel */}
        <div className="flex-1 flex flex-col min-h-0 border-r border-white/[0.04]">
          <ChatSimulator messages={messages} loading={loading} onSend={sendMessage} />
        </div>

        {/* Trace Panel */}
        <div className="lg:w-96 border-t lg:border-t-0 border-white/[0.04] bg-white/[0.01] overflow-y-auto">
          <AgentTrace traces={traces} />
        </div>
      </div>
    </main>
  );
}
