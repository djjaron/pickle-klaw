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
    return 'I can help with that. I found open court windows tomorrow around 8:00, 9:00, 10:00, and 11:00. Which one should I hold?';
  }

  if (lower.includes('price') || lower.includes('cost') || lower.includes('membership') || lower.includes('rate')) {
    return 'Drop-in play is $15. Standard membership is $49/month for 4 court sessions, Premium is $89/month for unlimited courts, and guests are $10 with a member.';
  }

  if (lower.includes('lesson') || lower.includes('coach') || lower.includes('clinic')) {
    return 'Lessons are available: private is $60/hour, semi-private is $40/person/hour, and group clinics are $25/person. What day are you looking at?';
  }

  if (lower.includes('waiver') || lower.includes('sign')) {
    return 'Yes, every player needs a signed waiver before playing. It can be completed online or at the front desk in about two minutes.';
  }

  if (lower.includes('hour') || lower.includes('open')) {
    return 'We are open Monday-Friday 6am-10pm, Saturday 7am-9pm, and Sunday 8am-8pm.';
  }

  if (lower.includes('event') || lower.includes('tournament') || lower.includes('round robin')) {
    return 'This week includes Monday Night Round Robin at 6pm, Wednesday Drill & Play at 7pm, and Saturday Morning Tournament at 9am.';
  }

  return 'I can help with court bookings, memberships, lessons, events, waivers, and general club questions. What would you like to do?';
}
