import { getDashboardStats } from '../../lib/db';
import { Handler, json } from '../../lib/netlify';
import '../../db/neon';

export const handler: Handler = async (event) => {
  try {
    const clubId = event.queryStringParameters?.clubId;
    return json(200, await getDashboardStats(clubId));
  } catch (error: any) {
    return json(200, {
      totalConversations: 0,
      totalMessages: 0,
      totalAgentRuns: 0,
      totalKnowledgeChunks: 0,
      totalBookings: 0,
      intents: {},
      avgLatency: 0,
      recentRuns: [],
      error: error.message,
    });
  }
};
