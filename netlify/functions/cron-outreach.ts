import { Handler, json } from '../../lib/netlify';

export const handler: Handler = async () => {
  return json(200, {
    ok: true,
    status: 'stub',
    message: 'Cron outreach hook is ready for future league reminders, waiver nudges, and booking follow-ups.',
  });
};
