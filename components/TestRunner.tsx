'use client';

import { useState } from 'react';
import { classifyIntent } from '@/lib/intent';

interface TestResult {
  message: string;
  intent: string;
  confidence: number;
  entities: Record<string, string>;
  requiresHuman: boolean;
  timestamp: number;
}

const TEST_PROMPTS = [
  'Can I book a court for tomorrow at 10am?',
  'I want to reserve a slot on Tuesday at 3pm',
  'Book a private event',
  'Schedule a lesson or clinic',
  'Join a play session',
  'How much is a membership?',
  'Become a member',
  'What events do you have this week?',
  'Can I get a private lesson?',
  'Visit the Pro Shop',
  'Does Jordan Lee have a waiver?',
  'sign waiver for Jordan',
  'Look up member Avery Chen',
  'Find me coach Sarah',
  'I have a problem with my booking',
  'Can I get a refund?',
  'What are your hours?',
  'How much does a drop-in cost?',
];

interface TestRunnerProps {
  onSend: (text: string) => void;
  loading: boolean;
}

export function TestRunner({ onSend, loading }: TestRunnerProps) {
  const [results, setResults] = useState<TestResult[]>([]);
  const [customInput, setCustomInput] = useState('');

  function runTest(message: string) {
    const intent = classifyIntent(message);
    const result: TestResult = {
      message,
      intent: intent.intent,
      confidence: intent.confidence,
      entities: intent.entities,
      requiresHuman: intent.requiresHuman,
      timestamp: Date.now(),
    };
    setResults(prev => [result, ...prev]);
    if (!loading) onSend(message);
  }

  function handleCustomSubmit() {
    const text = customInput.trim();
    if (!text) return;
    runTest(text);
    setCustomInput('');
  }

  const intentColors: Record<string, string> = {
    booking: 'bg-[#dff8e8] text-[#1b6b3a]',
    question: 'bg-[#e6f0ff] text-[#315d9d]',
    waiver: 'bg-[#fff0cc] text-[#8a5b00]',
    complaint: 'bg-[#ffe2e2] text-[#9d3030]',
    directory: 'bg-[#e8e0ff] text-[#5a2d9d]',
    pricing: 'bg-[#e0f2ff] text-[#1a5b8a]',
    general_question: 'bg-[#eef3eb] text-[#526256]',
  };

  const confidenceBar = (pct: number) => {
    const color = pct >= 90 ? 'bg-[#2f9b5f]' : pct >= 70 ? 'bg-[#d9961f]' : 'bg-[#ce4d4d]';
    return (
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e6ede2]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Prompt buttons grid */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#6a7a6e]">Test Prompts</h3>
          <span className="text-[10px] text-[#98a39a]">{TEST_PROMPTS.length} prompts</span>
        </div>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {TEST_PROMPTS.map((prompt) => {
            const intent = classifyIntent(prompt);
            return (
              <button
                key={prompt}
                onClick={() => runTest(prompt)}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg border border-[#d7e2d3] bg-white px-3 py-2 text-left transition-smooth hover:scale-[1.02] hover:shadow-lg hover:border-[#8bcaa1] hover:bg-[#f7fcf5] disabled:opacity-40"
              >
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${intentColors[intent.intent] || intentColors.general_question}`}>
                  {intent.intent}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs text-[#536356]">{prompt}</span>
                <span className={`shrink-0 text-[11px] font-semibold ${intent.confidence >= 90 ? 'text-[#1b6b3a]' : intent.confidence >= 70 ? 'text-[#8a5b00]' : 'text-[#9d3030]'}`}>
                  {intent.confidence}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={customInput}
          onChange={e => setCustomInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCustomSubmit()}
          placeholder="Or type your own test message..."
          className="min-w-0 flex-1 rounded-lg border border-[#cdd9c8] bg-white px-3 py-2 text-sm text-[#15211b] placeholder:text-[#8a968c] focus:border-[#2f9b5f] focus:outline-none focus:ring-2 focus:ring-[#b7f3d0]"
        />
        <button
          onClick={handleCustomSubmit}
          disabled={!customInput.trim() || loading}
          className="shrink-0 rounded-lg bg-[#153f2a] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#1e5b3d] disabled:opacity-30"
        >
          Test
        </button>
      </div>

      {/* Results table */}
      {results.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6a7a6e]">
            Results ({results.length})
          </h3>
          <div className="space-y-1">
            {results.map((r, i) => (
              <div key={`${r.timestamp}-${i}`} className="rounded-lg border border-[#dfe7da] bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#15211b]">{r.message}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${intentColors[r.intent] || intentColors.general_question}`}>
                        {r.intent}
                      </span>
                      <span className={`text-[11px] font-semibold ${r.confidence >= 90 ? 'text-[#1b6b3a]' : r.confidence >= 70 ? 'text-[#8a5b00]' : 'text-[#9d3030]'}`}>
                        {r.confidence}%
                      </span>
                      {r.requiresHuman && (
                        <span className="rounded border border-[#efb4b4] bg-[#fff0f0] px-1.5 py-0.5 text-[10px] text-[#9d3030]">Human</span>
                      )}
                      {Object.keys(r.entities).length > 0 && (
                        <span className="text-[10px] text-[#98a39a]">
                          {Object.entries(r.entities).map(([k, v]) => `${k}: ${v}`).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {confidenceBar(r.confidence)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
