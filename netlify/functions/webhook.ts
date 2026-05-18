import { getDb } from '../../db/db';
import { conversations, messages } from '../../db/schema';
import { runAgent } from '../../lib/agent';
import { resolveClub } from '../../lib/db';
import type { FunctionResponse, Handler } from '../../lib/netlify';

import '../../db/neon';

const GREETING =
  "Hi, you've reached TTC Palms. I'm the club assistant. How can I help you today?";
const REPROMPT = "Sorry, I didn't catch that. Could you repeat?";
const FALLBACK_GOODBYE = "Sorry, I'm having trouble hearing you. Please try calling back. Goodbye.";
const ERROR_REPLY = "Sorry, something went wrong on our end. Please try again in a moment.";

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function twiml(body: string): FunctionResponse {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'Cache-Control': 'no-store',
    },
    body: `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`,
  };
}

function gather(actionPath: string, prompt: string): string {
  return (
    `<Gather input="speech" action="${xmlEscape(actionPath)}" method="POST" ` +
    `speechTimeout="auto" language="en-US">` +
    `<Say voice="Polly.Joanna">${xmlEscape(prompt)}</Say>` +
    `</Gather>` +
    `<Say voice="Polly.Joanna">${xmlEscape(FALLBACK_GOODBYE)}</Say>` +
    `<Hangup/>`
  );
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return twiml(`<Say voice="Polly.Joanna">${xmlEscape(FALLBACK_GOODBYE)}</Say><Hangup/>`);
  }

  try {
    const form = new URLSearchParams(event.body || '');
    const speechResult = (form.get('SpeechResult') || '').trim();
    const fromNumber = form.get('From') || null;
    const callSid = form.get('CallSid') || null;

    const qs = event.queryStringParameters || {};
    let conversationId = qs.conversationId || undefined;

    const club = await resolveClub(null);

    if (!conversationId) {
      try {
        const inserted = await getDb()
          .insert(conversations)
          .values({
            clubId: club.id,
            source: 'voice',
            status: 'active',
            customerName: callSid ? `Caller ${callSid.slice(-6)}` : 'Caller',
            customerPhone: fromNumber,
          })
          .returning();
        conversationId = inserted[0]?.id;
      } catch {}
    }

    const actionPath =
      `/.netlify/functions/webhook` +
      (conversationId ? `?conversationId=${encodeURIComponent(conversationId)}` : '');

    if (!speechResult) {
      return twiml(gather(actionPath, GREETING));
    }

    if (conversationId) {
      try {
        await getDb().insert(messages).values({
          conversationId,
          role: 'customer',
          content: speechResult,
        });
      } catch {}
    }

    const result = await runAgent(club.id, speechResult, conversationId);

    if (conversationId) {
      try {
        await getDb().insert(messages).values({
          conversationId,
          role: 'agent',
          content: result.response,
          intent: result.intent.intent,
        });
      } catch {}
    }

    const body =
      `<Say voice="Polly.Joanna">${xmlEscape(result.response)}</Say>` +
      gather(actionPath, 'Anything else I can help with?');

    return twiml(body);
  } catch (error) {
    console.error('Voice webhook error:', error);
    return twiml(
      `<Say voice="Polly.Joanna">${xmlEscape(ERROR_REPLY)}</Say><Hangup/>`
    );
  }
};
