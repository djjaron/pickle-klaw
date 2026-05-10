'use client';

import { useEffect, useState } from 'react';

interface Stats {
  club?: { name: string; slug: string };
  totalConversations: number;
  totalMessages: number;
  totalAgentRuns: number;
  totalKnowledgeChunks: number;
  totalBookings: number;
  intents: Record<string, number>;
  avgLatency: number;
  recentRuns: Array<{
    id: string;
    intent: string;
    confidence: number;
    toolsUsed: string[];
    latencyMs: number;
    createdAt: string;
  }>;
  offline?: boolean;
}

const emptyStats: Stats = {
  totalConversations: 0,
  totalMessages: 0,
  totalAgentRuns: 0,
  totalKnowledgeChunks: 0,
  totalBookings: 0,
  intents: {},
  avgLatency: 0,
  recentRuns: [],
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch('/api/dashboard-stats?clubId=demo');
      const data = await res.json();
      setStats({
        totalConversations: Number(data.totalConversations) || 0,
        totalMessages: Number(data.totalMessages) || 0,
        totalAgentRuns: Number(data.totalAgentRuns) || 0,
        totalKnowledgeChunks: Number(data.totalKnowledgeChunks) || 0,
        totalBookings: Number(data.totalBookings) || 0,
        intents: data.intents && typeof data.intents === 'object' ? data.intents : {},
        avgLatency: Number(data.avgLatency) || 0,
        recentRuns: Array.isArray(data.recentRuns) ? data.recentRuns : [],
        offline: data.offline,
        club: data.club,
      });
    } catch {
      setStats(emptyStats);
    } finally {
      setLoading(false);
    }
  }

  const maxIntentCount = Math.max(1, ...Object.values(stats.intents || {}));

  return (
    <main className="app-surface min-h-dvh text-[#15211b]">
      <header className="sticky top-0 z-20 border-b border-[#dce6d7] bg-[#fbfcf8]/90 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#153f2a] text-sm font-black text-white shadow-sm">PK</span>
            <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6a7a6e]">Operator Dashboard</p>
            <h1 className="truncate text-lg font-semibold">{stats.club?.name || 'Pickle-Klaw'}</h1>
            </div>
          </div>
          <nav className="flex shrink-0 items-center gap-3 text-xs">
            <a href="/demo" className="font-medium text-[#1b6b3a] hover:text-[#153f2a]">Demo</a>
            <a href="/clubs/demo" className="text-[#667468] hover:text-[#15211b]">Club</a>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        {stats.offline && (
          <div className="mb-4 rounded-lg border border-[#ebca7d] bg-[#fff7dc] p-3 text-sm text-[#6d4b00]">
            DATABASE_URL is not configured, so the dashboard is showing fallback demo state.
          </div>
        )}

        {loading ? (
          <div className="text-sm text-[#667468]">Loading dashboard...</div>
        ) : (
          <div className="space-y-5">
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <StatCard label="Conversations" value={stats.totalConversations} />
              <StatCard label="Messages" value={stats.totalMessages} />
              <StatCard label="Agent Runs" value={stats.totalAgentRuns} />
              <StatCard label="Knowledge" value={stats.totalKnowledgeChunks} />
              <StatCard label="Avg Latency" value={`${stats.avgLatency}ms`} />
            </section>

            <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
              <div className="soft-card rounded-lg p-4">
                <h2 className="text-sm font-semibold">Intent Breakdown</h2>
                <div className="mt-4 space-y-3">
                  {Object.keys(stats.intents).length === 0 ? (
                    <p className="text-sm text-[#667468]">No logged agent runs yet.</p>
                  ) : (
                    Object.entries(stats.intents).map(([intent, count]) => (
                      <div key={intent} className="grid grid-cols-[5rem_1fr_2rem] items-center gap-3">
                        <span className="text-xs capitalize text-[#536356]">{intent}</span>
                        <div className="h-2 overflow-hidden rounded-full bg-[#e4ece0]">
                          <div className="h-full rounded-full bg-[#2f9b5f]" style={{ width: `${(count / maxIntentCount) * 100}%` }} />
                        </div>
                        <span className="text-right text-xs text-[#667468]">{count}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="soft-card rounded-lg p-4">
                <h2 className="text-sm font-semibold">Recent Agent Runs</h2>
                <div className="mt-4 space-y-2">
                  {stats.recentRuns.length === 0 ? (
                    <p className="text-sm text-[#667468]">Run the simulator to populate trace history.</p>
                  ) : (
                    stats.recentRuns.map((run) => (
                      <div key={run.id} className="grid grid-cols-[1fr_auto] gap-3 rounded-md border border-[#dfe7da] bg-[#f8fbf5] p-3">
                        <div>
                          <div className="text-sm font-medium capitalize">{run.intent}</div>
                          <div className="mt-1 text-[11px] text-[#667468]">{run.toolsUsed.length ? run.toolsUsed.join(', ') : 'No tools'}</div>
                        </div>
                        <div className="text-right text-[11px] text-[#667468]">
                          <div>{run.confidence}%</div>
                          <div>{run.latencyMs}ms</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-[#b8dfc4] bg-[#edf9f1] p-4">
              <h2 className="text-sm font-semibold">MVP Checklist</h2>
              <div className="mt-3 grid gap-2 text-xs text-[#536356] sm:grid-cols-2 lg:grid-cols-3">
                {['Text demo simulator', 'Club knowledge base', 'Fake booking/member/waiver tools', 'Real Neon logging', 'PWA operator dashboard', 'Voice integration later'].map((item, index) => (
                  <div key={item} className="rounded-md border border-[#cfe4d4] bg-white/70 px-3 py-2">
                    <span className={index < 5 ? 'font-semibold text-[#1b6b3a]' : 'text-[#8a968c]'}>{index < 5 ? 'Done' : 'Later'}</span>
                    <span className="ml-2">{item}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="soft-card rounded-lg p-4">
      <div className="text-2xl font-semibold text-[#15211b]">{value}</div>
      <div className="mt-1 text-xs text-[#667468]">{label}</div>
    </div>
  );
}
