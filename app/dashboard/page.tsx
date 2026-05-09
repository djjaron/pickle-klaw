'use client';

import { useState, useEffect } from 'react';

interface Stats {
  totalConversations: number;
  totalMessages: number;
  totalAgentRuns: number;
  intents: Record<string, number>;
  avgLatency: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalConversations: 0, totalMessages: 0, totalAgentRuns: 0,
    intents: {}, avgLatency: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch('/.netlify/functions/dashboard-stats');
      const data = await res.json();
      setStats(data);
    } catch {} finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#0a0a0a] text-white">
      <header className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Dashboard</h1>
          <p className="text-xs text-white/30">Pickle-Klaw Analytics</p>
        </div>
        <a href="/demo" className="text-xs text-blue-400 hover:text-blue-300">
          ← Demo
        </a>
      </header>

      <div className="p-6 max-w-4xl">
        {loading ? (
          <div className="text-white/30">Loading stats...</div>
        ) : (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard label="Conversations" value={stats.totalConversations} icon="💬" />
              <StatCard label="Messages" value={stats.totalMessages} icon="✉️" />
              <StatCard label="Agent Runs" value={stats.totalAgentRuns} icon="🤖" />
              <StatCard label="Avg Latency" value={`${stats.avgLatency}ms`} icon="⚡" />
            </div>

            {/* Intent breakdown */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6">
              <h3 className="text-sm font-semibold mb-4">Intent Breakdown</h3>
              {Object.keys(stats.intents).length === 0 ? (
                <p className="text-sm text-white/30">No data yet. Send some messages in the demo!</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(stats.intents).map(([intent, count]) => (
                    <div key={intent} className="flex items-center gap-3">
                      <span className="text-sm w-24 text-white/60 capitalize">{intent}</span>
                      <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${(count / Math.max(...Object.values(stats.intents) as number[])) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-white/40 w-8 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 p-6 bg-blue-500/[0.05] border border-blue-500/20 rounded-xl">
              <h3 className="text-sm font-semibold mb-2">Next Steps</h3>
              <ul className="text-xs text-white/50 space-y-1.5">
                <li>✓ Text demo simulator</li>
                <li>✓ Club knowledge base</li>
                <li>✓ Fake tools (booking, member, waiver)</li>
                <li>✓ Real Neon logging</li>
                <li>→ Connect Twilio for live SMS</li>
                <li>→ Add voice with Twilio Media Streams</li>
                <li>→ Connect Stripe for payments</li>
                <li>→ Deploy to app stores (PWA)</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-white/30 mt-1">{label}</div>
    </div>
  );
}
