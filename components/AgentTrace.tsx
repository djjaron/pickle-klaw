'use client';

interface AgentTraceProps {
  traces: any[];
}

export function AgentTrace({ traces }: AgentTraceProps) {
  const safeTraces = Array.isArray(traces) ? traces : [];
  const validTraces = safeTraces.filter(Boolean);

  if (validTraces.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-[#7a877c]">
        <div className="mx-auto mb-3 grid size-10 place-items-center rounded-lg border border-[#d7e2d3] bg-white text-xs font-semibold text-[#607064]">TR</div>
        <p className="font-medium text-[#435044]">Waiting for a run</p>
        <p className="mt-1 text-xs">Intent, tools, model, and knowledge appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#6a7a6e]">Agent Trace</h3>
      {validTraces.map((trace, i) => {
        const tools = Array.isArray(trace.tools) ? trace.tools : [];
        const knowledge = Array.isArray(trace.knowledge) ? trace.knowledge : [];
        const confidence = typeof trace.confidence === 'number' ? trace.confidence : 0;
        const timestamp = trace.timestamp ? new Date(trace.timestamp) : null;

        return (
        <div key={i} className="animate-slide-in rounded-lg bg-gradient-to-br from-[#d9ead3] to-[#cfe5fa] p-px">
        <div className="space-y-3 rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#7a877c]">Intent</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              trace.intent === 'booking' ? 'bg-[#dff8e8] text-[#1b6b3a]' :
              trace.intent === 'question' ? 'bg-[#e6f0ff] text-[#315d9d]' :
              trace.intent === 'waiver' ? 'bg-[#fff0cc] text-[#8a5b00]' :
              trace.intent === 'complaint' ? 'bg-[#ffe2e2] text-[#9d3030]' :
              'bg-[#eef3eb] text-[#526256]'
            }`}>
              {trace.intent || 'unknown'}
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-[#7a877c]">Confidence</span>
              <span className="text-[#526256]">{confidence}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#e6ede2]">
              <div
                className={`confidence-bar h-full rounded-full ${
                  confidence > 70 ? 'bg-[#2f9b5f]' :
                  confidence > 40 ? 'bg-[#d9961f]' : 'bg-[#ce4d4d]'
                }`}
                style={{ width: `${confidence}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[#7a877c]">Tools</span>
            <span className="max-w-40 truncate text-[#526256]">
              {tools.length > 0 ? tools.join(', ') : 'None'}
            </span>
          </div>

          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[#7a877c]">Knowledge</span>
            <span className="text-[#526256]">
              {knowledge.length > 0 ? `${knowledge.length} chunks` : 'None'}
            </span>
          </div>

          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[#7a877c]">Latency</span>
            <span className="text-[#526256]">{trace.latency}ms</span>
          </div>

          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[#7a877c]">Model</span>
            <span className="max-w-40 truncate text-[#526256]">{trace.model || 'template'}</span>
          </div>

          {trace.toolResult?.message && (
            <div className="rounded-md border border-[#dfe7da] bg-[#f6faf3] p-2 text-[11px] leading-relaxed text-[#526256]">
              {trace.toolResult.message}
            </div>
          )}

          {trace.requiresHuman && (
            <div className="rounded border border-[#efb4b4] bg-[#fff0f0] px-2 py-1 text-[10px] text-[#9d3030]">
              Human escalation required
            </div>
          )}

          <div className="text-right text-[9px] text-[#98a39a]">
            {timestamp ? timestamp.toLocaleTimeString() : 'No timestamp'}
          </div>
        </div>
        </div>
      )})}
    </div>
  );
}
