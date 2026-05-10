'use client';

import { useState } from 'react';

interface ChatSimulatorProps {
  messages: Array<{ role: string; content: string }>;
  loading: boolean;
  onSend: (text: string) => void;
}

export function ChatSimulator({ messages, loading, onSend }: ChatSimulatorProps) {
  const [input, setInput] = useState('');

  function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    onSend(text);
  }

  const quickPrompts = [
    'Can I book a court for tomorrow at 10am?',
    'How much is a membership?',
    'What events do you have this week?',
    'Does Jordan Lee have a waiver?',
    'Can I get a private lesson?',
  ];

  return (
    <div className="flex h-full flex-col rounded-none bg-[#f9fbf5] lg:rounded-lg">
      <div className="flex items-center justify-between border-b border-[#dfe7da] px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-sm font-semibold text-[#15211b]">Customer Thread</h2>
          <p className="text-xs text-[#667468]">Simulator conversation</p>
        </div>
        <span className="rounded-md bg-[#dff8e8] px-2.5 py-1 text-[11px] font-semibold text-[#1b6b3a]">Live demo</span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'customer' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[86%] rounded-lg px-4 py-3 text-sm leading-relaxed shadow-sm ${
                msg.role === 'customer'
                  ? 'bg-[#153f2a] text-white'
                  : 'border border-[#dfe7da] bg-white text-[#29362f]'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg border border-[#dfe7da] bg-white px-4 py-3 text-sm text-[#667468]">
              <span className="animate-pulse">Drafting response...</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto border-t border-[#dfe7da] px-4 py-3 sm:px-5">
        {quickPrompts.map((p, i) => (
          <button
            key={i}
            onClick={() => onSend(p)}
            className="shrink-0 rounded-md border border-[#d7e2d3] bg-white px-3 py-1.5 text-xs text-[#536356] transition hover:border-[#8bcaa1] hover:bg-[#f2faf4] disabled:opacity-40"
            disabled={loading}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="border-t border-[#dfe7da] bg-white/70 p-4 sm:p-5">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Type a customer message..."
            className="min-w-0 flex-1 rounded-lg border border-[#cdd9c8] bg-white px-4 py-3 text-sm text-[#15211b] placeholder:text-[#8a968c] focus:border-[#2f9b5f] focus:outline-none focus:ring-2 focus:ring-[#b7f3d0]"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="min-h-11 rounded-lg bg-[#153f2a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e5b3d] disabled:opacity-30"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
