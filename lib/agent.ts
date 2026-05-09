import { classifyIntent, toolBooking, toolMemberLookup, toolWaiverCheck, retrieveKnowledge, type ClassifiedIntent } from './tools';
import { db } from '@/db/db';
import { conversations, messages, agentRuns } from '@/db/schema';
import { eq } from 'drizzle-orm';

// ─── Model Adapter ───────────────────────────────────────────────────────────

interface ModelConfig {
  provider: 'openai' | 'deepseek' | 'kimi';
  apiKey: string;
  model: string;
}

function getModelConfig(): ModelConfig {
  if (process.env.OPENAI_API_KEY) {
    return { provider: 'openai', apiKey: process.env.OPENAI_API_KEY, model: 'gpt-4o-mini' };
  }
  if (process.env.DEEPSEEK_API_KEY) {
    return { provider: 'deepseek', apiKey: process.env.DEEPSEEK_API_KEY, model: 'deepseek-chat' };
  }
  // Fallback: template-based responses without LLM
  return { provider: 'openai', apiKey: '', model: 'none' };
}

async function callLLM(systemPrompt: string, userMessage: string): Promise<string> {
  const config = getModelConfig();
  if (config.model === 'none') {
    return generateTemplateResponse(systemPrompt, userMessage);
  }

  const endpoints: Record<string, string> = {
    openai: 'https://api.openai.com/v1/chat/completions',
    deepseek: 'https://api.deepseek.com/v1/chat/completions',
    kimi: 'https://api.moonshot.cn/v1/chat/completions',
  };

  const res = await fetch(endpoints[config.provider], {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 500,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    return generateTemplateResponse(systemPrompt, userMessage);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || generateTemplateResponse(systemPrompt, userMessage);
}

function generateTemplateResponse(systemPrompt: string, userMessage: string): string {
  const lower = userMessage.toLowerCase();
  if (lower.includes('book') || lower.includes('court') || lower.includes('reserve')) {
    return "I can help you book a court! Which day works for you? We're open 6am-10pm on weekdays, 7am-9pm Saturday, and 8am-8pm Sunday.";
  }
  if (lower.includes('price') || lower.includes('cost') || lower.includes('membership')) {
    return "Our pricing: Drop-in is $15. Standard membership is $49/month (4 court sessions), Premium is $89/month (unlimited). Guests are $10 with a member.";
  }
  if (lower.includes('lesson') || lower.includes('coach')) {
    return "We offer private lessons at $60/hr, semi-private at $40/person/hr, and group clinics at $25/person. Would you like to book one?";
  }
  if (lower.includes('waiver') || lower.includes('sign')) {
    return "All players need a signed waiver before hitting the courts. You can sign it online or at the front desk. It takes about 2 minutes!";
  }
  if (lower.includes('hour') || lower.includes('open')) {
    return "We're open Monday-Friday 6am-10pm, Saturday 7am-9pm, Sunday 8am-8pm. Come on by!";
  }
  return "I'm your pickleball club assistant. I can help with court bookings, membership questions, lessons, events, and more. What can I do for you?";
}

// ─── Agent Orchestrator ──────────────────────────────────────────────────────

export interface AgentResult {
  response: string;
  intent: ClassifiedIntent;
  toolsCalled: string[];
  knowledgeUsed: string[];
  trace: {
    intent: string;
    confidence: number;
    tools: string[];
    knowledge: string[];
    latency: number;
    requiresHuman: boolean;
    timestamp: string;
  };
}

export async function runAgent(
  clubId: string,
  customerMessage: string,
  conversationId?: string
): Promise<AgentResult> {
  const start = Date.now();
  const toolsCalled: string[] = [];
  const knowledgeUsed: string[] = [];

  // 1. Classify intent
  const intent = classifyIntent(customerMessage);

  // 2. Handle human escalation
  if (intent.requiresHuman) {
    const response = "I'll connect you with our team. Someone will get back to you shortly.";
    return buildResult(response, intent, toolsCalled, knowledgeUsed, start);
  }

  // 3. Run knowledge retrieval
  const knowledge = await retrieveKnowledge(clubId, customerMessage);
  knowledgeUsed.push(...knowledge);

  // 4. Execute tools based on intent
  let toolResult: any = null;
  switch (intent.intent) {
    case 'booking':
      toolResult = await toolBooking(clubId, intent.entities);
      toolsCalled.push('toolBooking');
      break;
    case 'waiver':
      toolResult = await toolWaiverCheck(clubId, intent.entities);
      toolsCalled.push('toolWaiverCheck');
      break;
    case 'directory':
      toolResult = await toolMemberLookup(clubId, intent.entities);
      toolsCalled.push('toolMemberLookup');
      break;
  }

  // 5. Build system prompt with knowledge + tool results
  const systemPrompt = buildSystemPrompt(clubId, knowledge, toolResult, intent);
  const response = await callLLM(systemPrompt, customerMessage);

  // 6. Log agent run
  const now = new Date();
  const run = {
    conversationId: conversationId || 'demo',
    intent: intent.intent,
    confidence: intent.confidence,
    toolsUsed: toolsCalled,
    knowledgeChunks: knowledgeUsed.slice(0, 3),
    modelResponse: response,
    traceData: { intent, entities: intent.entities, toolResult },
    latencyMs: Date.now() - start,
    createdAt: now,
  };

  try {
    await db.insert(agentRuns).values(run);
  } catch {}

  return buildResult(response, intent, toolsCalled, knowledgeUsed, start);
}

function buildSystemPrompt(
  clubId: string,
  knowledge: string[],
  toolResult: any,
  intent: ClassifiedIntent
): string {
  let prompt = `You are a friendly, professional AI receptionist for a pickleball club. Help customers with bookings, questions, and information.

Club Knowledge:
${knowledge.map(k => `- ${k}`).join('\n')}

`;

  if (toolResult) {
    prompt += `Tool Results: ${JSON.stringify(toolResult)}\n\n`;
  }

  prompt += `Customer Intent: ${intent.intent} (confidence: ${intent.confidence}%)
Rules:
- Be concise and helpful
- If you can book something, confirm date/time and available slots
- If pricing question, give exact numbers
- If you need more info, ask exactly one follow-up question
- Never make up prices or availability — use only the provided data`;

  return prompt;
}

function buildResult(
  response: string,
  intent: ClassifiedIntent,
  toolsCalled: string[],
  knowledgeUsed: string[],
  start: number
): AgentResult {
  return {
    response,
    intent,
    toolsCalled,
    knowledgeUsed,
    trace: {
      intent: intent.intent,
      confidence: intent.confidence,
      tools: toolsCalled,
      knowledge: knowledgeUsed,
      latency: Date.now() - start,
      requiresHuman: intent.requiresHuman,
      timestamp: new Date().toISOString(),
    },
  };
}
