'use client';

interface AgentTraceProps {
  traces: any[];
}

export function AgentTrace({ traces }: AgentTraceProps) {
  if (traces.length === 0) {
    return (
      <div className="p-6 text-center text-white/20 text-sm">
        <div className="text-3xl mb-3">🔍</div>
        <p>Agent trace will appear here</p>
        <p className="text-xs mt-1">See what the AI classified, which tools it ran, and what knowledge it used</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-xs font-mono text-white/30 uppercase tracking-wider mb-3">Agent Trace</h3>
      {traces.map((trace, i) => (
        <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
          {/* Intent */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-white/40">Intent</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              trace.intent === 'booking' ? 'bg-blue-500/20 text-blue-400' :
              trace.intent === 'question' ? 'bg-green-500/20 text-green-400' :
              trace.intent === 'waiver' ? 'bg-amber-500/20 text-amber-400' :
              trace.intent === 'complaint' ? 'bg-red-500/20 text-red-400' :
              'bg-white/[0.06] text-white/60'
            }`}>
              {trace.intent}
            </span>
          </div>

          {/* Confidence bar */}
          <div>
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-white/30">Confidence</span>
              <span className="text-white/50">{trace.confidence}%</span>
            </div>
            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  trace.confidence > 70 ? 'bg-green-500' :
                  trace.confidence > 40 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${trace.confidence}%` }}
              />
            </div>
          </div>

          {/* Tools */}
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-white/30">Tools</span>
            <span className="text-white/50">
              {trace.tools.length > 0 ? trace.tools.join(', ') : 'None'}
            </span>
          </div>

          {/* Knowledge */}
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-white/30">Knowledge</span>
            <span className="text-white/50">
              {trace.knowledge.length > 0 ? `${trace.knowledge.length} chunks` : 'None'}
            </span>
          </div>

          {/* Latency */}
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-white/30">Latency</span>
            <span className="text-white/50">{trace.latency}ms</span>
          </div>

          {/* Human escalation */}
          {trace.requiresHuman && (
            <div className="text-[10px] px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20">
              Escalated to human
            </div>
          )}

          {/* Timestamp */}
          <div className="text-[9px] text-white/15 text-right">
            {new Date(trace.timestamp).toLocaleTimeString()}
          </div>
        </div>
      ))}
    </div>
  );
}
