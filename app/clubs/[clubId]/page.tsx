import { defaultKnowledge } from '@/lib/rag';
import { getDashboardStats, resolveClub } from '@/lib/db';
import { KnowledgeManager } from '@/components/KnowledgeManager';

export const dynamic = 'force-dynamic';

export default async function ClubPage({ params }: { params: { clubId: string } }) {
  const club = await resolveClub(params.clubId);
  const stats = await getDashboardStats(params.clubId);
  const settings = (club.settings || {}) as {
    courtCount?: number;
    bookingWindow?: number;
    maxGroupSize?: number;
    requireWaiver?: boolean;
    operatingHours?: Array<{ open: string; close: string }>;
  };

  return (
    <main className="app-surface min-h-dvh text-[#15211b]">
      <header className="sticky top-0 z-20 border-b border-[#dce6d7] bg-[#fbfcf8]/90 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#153f2a] text-sm font-black text-white shadow-sm">PK</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6a7a6e]">Club Workspace</p>
              <h1 className="truncate text-lg font-semibold">{club.name}</h1>
            </div>
          </div>
          <nav className="flex shrink-0 items-center gap-3 text-xs">
            <a href="/demo" className="font-medium text-[#1b6b3a] hover:text-[#153f2a]">Demo</a>
            <a href="/dashboard" className="text-[#667468] hover:text-[#15211b]">Dashboard</a>
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[20rem_1fr]">
        <aside className="space-y-3">
          <section className="soft-card rounded-lg p-4">
            <h2 className="text-sm font-semibold">Club Profile</h2>
            <div className="mt-4 space-y-3 text-sm">
              <Field label="Slug" value={club.slug} />
              <Field label="Phone" value={club.phone || 'Not set'} />
              <Field label="Address" value={club.address || 'Not set'} />
              <Field label="Timezone" value={club.timezone || 'Not set'} />
              <Field label="Website" value={club.website || 'Not set'} href={club.website || undefined} />
            </div>
          </section>

          <section className="soft-card rounded-lg p-4">
            <h2 className="text-sm font-semibold">Links</h2>
            <div className="mt-3 space-y-2">
              <a
                href="https://ttcpalms.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-md border border-[#dfe7da] bg-[#f8fbf5] px-3 py-2 text-sm font-medium text-[#1b6b3a] transition hover:border-[#8bcaa1] hover:bg-[#f7fcf5]"
              >
                TTCPalms.com →
              </a>
            </div>
          </section>

          <section className="soft-card rounded-lg p-4">
            <h2 className="text-sm font-semibold">Operating Rules</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Metric label="Courts" value={settings.courtCount || 8} />
              <Metric label="Window" value={`${settings.bookingWindow || 14}d`} />
              <Metric label="Group Max" value={settings.maxGroupSize || 4} />
              <Metric label="Waiver" value={settings.requireWaiver === false ? 'No' : 'Yes'} />
            </div>
          </section>
        </aside>

        <div className="space-y-5">
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric label="Conversations" value={stats.totalConversations} />
            <Metric label="Messages" value={stats.totalMessages} />
            <Metric label="Agent Runs" value={stats.totalAgentRuns} />
            <Metric label="Knowledge" value={stats.totalKnowledgeChunks} />
          </section>

          <section className="soft-card rounded-lg p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Knowledge Base</h2>
              <span className="rounded-md border border-[#b8dfc4] bg-[#dff8e8] px-2 py-1 text-[11px] font-semibold text-[#1b6b3a]">
                MVP RAG
              </span>
            </div>
            <div className="mt-4 grid gap-3">
              {defaultKnowledge.map((chunk) => (
                <article key={chunk.category} className="rounded-lg border border-[#dfe7da] bg-[#f8fbf5] p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[#1b6b3a]">{chunk.category}</div>
                  <p className="mt-2 text-sm leading-relaxed text-[#536356]">{chunk.content}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="soft-card rounded-lg p-4">
            <h2 className="text-sm font-semibold">Integration Roadmap</h2>
            <div className="mt-4 grid gap-2 text-sm text-[#536356] sm:grid-cols-2">
              {['Netlify Functions chat API', 'Neon logging', 'Fake booking/member/waiver tools', 'Twilio SMS later', 'SIP voice later', 'Stripe payments later'].map((item, index) => (
                <div key={item} className="rounded-md border border-[#dfe7da] bg-[#f8fbf5] px-3 py-2">
                  <span className={index < 3 ? 'font-semibold text-[#1b6b3a]' : 'text-[#8a968c]'}>{index < 3 ? 'Active' : 'Later'}</span>
                  <span className="ml-2">{item}</span>
                </div>
              ))}
            </div>
          </section>

          <KnowledgeManager clubId={params.clubId} />
        </div>
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6a7a6e]">{label}</div>
      <div className="mt-1 break-words text-[#536356]">{value}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="soft-card rounded-lg p-4">
      <div className="text-xl font-semibold text-[#15211b]">{value}</div>
      <div className="mt-1 text-xs text-[#667468]">{label}</div>
    </div>
  );
}
