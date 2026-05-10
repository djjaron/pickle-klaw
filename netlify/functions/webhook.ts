import { Handler, json } from '../../lib/netlify';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  return json(200, {
    received: true,
    status: 'stub',
    message: 'Webhook endpoint reserved for Twilio or SIP events after the text MVP.',
  });
};
