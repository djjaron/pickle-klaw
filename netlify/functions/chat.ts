import { Handler } from '@netlify/functions';
import { runAgent } from '../../lib/agent';
import { db } from '../../db/db';
import { conversations, messages } from '../../db/schema';

// Load DB before handler
import '../../db/neon';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { message, clubId, conversationId } = body;

    if (!message) {
      return { statusCode: 400, body: JSON.stringify({ error: 'message is required' }) };
    }

    const club_id = clubId || 'demo-club';

    // Create or get conversation
    let convId = conversationId;
    if (!convId) {
      const conv = await db.insert(conversations).values({
        clubId: club_id,
        source: 'demo',
        status: 'active',
        customerName: 'Demo User',
      }).returning();
      convId = conv[0]?.id;
    }

    // Save customer message
    if (convId) {
      await db.insert(messages).values({
        conversationId: convId,
        role: 'customer',
        content: message,
      });
    }

    // Run agent
    const result = await runAgent(club_id, message, convId || undefined);

    // Save agent response
    if (convId) {
      await db.insert(messages).values({
        conversationId: convId,
        role: 'agent',
        content: result.response,
        intent: result.intent.intent,
      });
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response: result.response,
        conversationId: convId,
        trace: result.trace,
      }),
    };
  } catch (error: any) {
    console.error('Chat error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal error' }),
    };
  }
};
