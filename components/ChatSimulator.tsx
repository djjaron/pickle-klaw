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
    'Do I need to sign a waiver?',
    'Are there any tennis lessons?',
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'customer' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'customer'
                  ? 'bg-blue-500/20 text-blue-100'
                  : 'bg-white/[0.06] text-white/80 border border-white/[0.08]'
              }`}
            >
              {msg.role === 'agent' && <span className="text-xs text-white/30 mr-1">🎾</span>}
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/[0.06] rounded-2xl px-4 py-3 text-sm text-white/40">
              <span className="animate-pulse">typing...</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick prompts */}
      <div className="px-4 pb-2 flex flex-wrap gap-1.5">
        {quickPrompts.map((p, i) => (
          <button
            key={i}
            onClick={() => onSend(p)}
            className="text-[10px] px-2.5 py-1 rounded-full bg-white/[0.04] text-white/40 border border-white/[0.06] hover:bg-white/[0.08] transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/[0.06]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Type a customer message..."
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-blue-500 hover:bg-blue-400 disabled:opacity-30 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
