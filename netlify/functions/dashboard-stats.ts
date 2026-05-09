import { Handler } from '@netlify/functions';
import { db } from '../../db/db';
import '../../db/neon';

export const handler: Handler = async () => {
  try {
    const [convCount, msgCount, runCount, runs] = await Promise.all([
      db.$count('conversations'),
      db.$count('messages'),
      db.$count('agent_runs'),
      db.select({ intent: 'intent' }).from('agent_runs').all(),
    ]);

    const intents: Record<string, number> = {};
    let totalLatency = 0;
    for (const r of runs as any[]) {
      intents[r.intent] = (intents[r.intent] || 0) + 1;
      totalLatency += r.latency_ms || 0;
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalConversations: convCount,
        totalMessages: msgCount,
        totalAgentRuns: runCount,
        intents,
        avgLatency: runCount > 0 ? Math.round(totalLatency / runCount) : 0,
      }),
    };
  } catch (error: any) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalConversations: 0, totalMessages: 0, totalAgentRuns: 0,
        intents: {}, avgLatency: 0,
      }),
    };
  }
};
