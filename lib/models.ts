export interface ModelConfig {
  provider: 'openai' | 'deepseek' | 'kimi' | 'anthropic' | 'template';
  apiKey: string;
  model: string;
  endpoint?: string;
}

export function getModelConfig(): ModelConfig {
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      endpoint: 'https://api.openai.com/v1/chat/completions',
    };
  }

  if (process.env.DEEPSEEK_API_KEY) {
    return {
      provider: 'deepseek',
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      endpoint: 'https://api.deepseek.com/v1/chat/completions',
    };
  }

  if (process.env.KIMI_API_KEY) {
    return {
      provider: 'kimi',
      apiKey: process.env.KIMI_API_KEY,
      model: process.env.KIMI_MODEL || 'moonshot-v1-8k',
      endpoint: 'https://api.moonshot.cn/v1/chat/completions',
    };
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest',
      endpoint: 'https://api.anthropic.com/v1/messages',
    };
  }

  return { provider: 'template', apiKey: '', model: 'template' };
}

export async function callModel(systemPrompt: string, userMessage: string): Promise<string> {
  const config = getModelConfig();

  if (!config.endpoint) {
    return generateTemplateResponse(userMessage);
  }

  try {
    if (config.provider === 'anthropic') {
      return callAnthropic(config, systemPrompt, userMessage);
    }

    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 420,
        temperature: 0.25,
      }),
    });

    if (!response.ok) {
      return generateTemplateResponse(userMessage);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || generateTemplateResponse(userMessage);
  } catch {
    return generateTemplateResponse(userMessage);
  }
}

async function callAnthropic(config: ModelConfig, systemPrompt: string, userMessage: string) {
  const response = await fetch(config.endpoint!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      max_tokens: 420,
      temperature: 0.25,
    }),
  });

  if (!response.ok) {
    return generateTemplateResponse(userMessage);
  }

  const data = await response.json();
  const text = data.content?.find((part: { type?: string; text?: string }) => part.type === 'text')?.text;
  return text || generateTemplateResponse(userMessage);
}

function generateTemplateResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase();

  if (lower.includes('book') || lower.includes('court') || lower.includes('reserve')) {
    return 'I can help with that. Courts are available for reservation online at ttcpalms.com/book-court. Lit courts are open dusk to 10 PM daily. Would you like me to check availability for a specific day?';
  }

  if (lower.includes('price') || lower.includes('cost') || lower.includes('membership') || lower.includes('rate')) {
    return 'TTC Palms offers Tennis, Pickleball, Social, Homeowner, and Founding memberships. Contact frontdesk@ttcpalms.com or call (760) 346-6126 for details. You can also schedule a tour at ttcpalms.com/membership.';
  }

  if (lower.includes('lesson') || lower.includes('coach') || lower.includes('clinic')) {
    return 'We offer private lessons by appointment (60 or 90 min) with USPTA/PPR certified pros, and Morning Clinics Mon/Wed/Fri 7AM–9AM (8 players max). Sunset Socials are coming soon on Thu & Sat evenings!';
  }

  if (lower.includes('waiver') || lower.includes('sign')) {
    return 'All players must sign a waiver before playing. You can complete it online at ttcpalms.com/waiver. Guest waivers are also available — all players need one before stepping on the courts.';
  }

  if (lower.includes('hour') || lower.includes('open')) {
    return 'TTC Palms is open 7 days a week. The Executive Office is open Mon–Fri 9 AM – 1 PM. Lit courts are available dusk to 10 PM. We\'re located at 45750 San Luis Rey in Palm Desert.';
  }

  if (lower.includes('event') || lower.includes('tournament') || lower.includes('social')) {
    return 'TTC Palms hosts Morning Clinics (Mon/Wed/Fri 7AM), Sunset Socials (Thu/Sat evenings — coming soon), and regular tournaments. Check ttcpalms.com/events for the latest schedule.';
  }

  return 'Welcome to TTC Palms — the desert\'s premier tennis & pickleball club. I can help with court reservations, memberships, lessons, events, waivers, and directions. What can I assist you with?';
}
