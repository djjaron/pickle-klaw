import { getDb } from '../../db/db';
import { conversations, messages } from '../../db/schema';
import { runAgent } from '../../lib/agent';
import { resolveClub } from '../../lib/db';
import { Handler, json } from '../../lib/netlify';

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

    const club = await resolveClub(clubId);

    // Create or get conversation
    let convId = conversationId;
    if (!convId) {
      try {
        const conv = await getDb().insert(conversations).values({
          clubId: club.id,
          source: 'demo',
          status: 'active',
          customerName: 'Demo User',
        }).returning();
        convId = conv[0]?.id;
      } catch {}
    }

    // Save customer message
    if (convId) {
      try {
        await getDb().insert(messages).values({
          conversationId: convId,
          role: 'customer',
          content: message,
        });
      } catch {}
    }

    // Run agent
    const result = await runAgent(club.id, message, convId || undefined);

    // Save agent response
    if (convId) {
      try {
        await getDb().insert(messages).values({
          conversationId: convId,
          role: 'agent',
          content: result.response,
          intent: result.intent.intent,
        });
      } catch {}
    }

    return json(200, {
      response: result.response,
      conversationId: convId,
      club: { id: club.id, name: club.name, slug: club.slug },
      trace: result.trace,
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    return json(500, { error: error.message || 'Internal error' });
  }
};
