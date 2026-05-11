import { getDb } from '@/db/db';
import { agentRuns, messages } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { callModel, getModelConfig } from './models';
import { retrieveKnowledge } from './rag';
import { classifyIntent, toolBooking, toolMemberLookup, toolWaiverCheck } from './tools';
import type { ClassifiedIntent } from './intent';

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
    toolResult: unknown;
    latency: number;
    requiresHuman: boolean;
    model: string;
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
  let toolResult: unknown = null;

  // 1. Classify intent
  const intent = classifyIntent(customerMessage);

  // 2. Handle human escalation
  if (intent.requiresHuman) {
    const response = "I'll connect you with our team. Someone will get back to you shortly.";
    return buildResult(response, intent, toolsCalled, knowledgeUsed, toolResult, start);
  }

  // 3. Load recent conversation history for context
  const history = await loadHistory(conversationId, 6);

  // 4. Run knowledge retrieval
  const knowledge = await retrieveKnowledge(clubId, customerMessage);
  knowledgeUsed.push(...knowledge);

  // 5. Execute tools based on intent
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

  // 6. Build system prompt with history + knowledge + tool results
  const systemPrompt = buildSystemPrompt(clubId, knowledge, toolResult, intent, history);
  const response = await callModel(systemPrompt, customerMessage);

  // 7. Log agent run
  const now = new Date();
  if (conversationId) {
    const run = {
      conversationId,
      intent: intent.intent,
      confidence: intent.confidence,
      toolsUsed: toolsCalled,
      knowledgeChunks: knowledgeUsed.slice(0, 3),
      modelResponse: response,
      traceData: { intent, entities: intent.entities, toolResult, model: getModelConfig() },
      latencyMs: Date.now() - start,
      createdAt: now,
    };

    try {
      await getDb().insert(agentRuns).values(run);
    } catch {}
  }

  return buildResult(response, intent, toolsCalled, knowledgeUsed, toolResult, start);
}

async function loadHistory(conversationId?: string, limit = 6): Promise<Array<{ role: string; content: string }>> {
  if (!conversationId) return [];
  try {
    const db = getDb();
    const rows = await db.query.messages.findMany({
      where: eq(messages.conversationId, conversationId),
      orderBy: [desc(messages.createdAt)],
      limit,
    });
    return rows.reverse().map(m => ({ role: m.role, content: m.content }));
  } catch {
    return [];
  }
}

function buildSystemPrompt(
  clubId: string,
  knowledge: string[],
  toolResult: any,
  intent: ClassifiedIntent,
  history: Array<{ role: string; content: string }> = [],
): string {
  let prompt = `You are a friendly, professional AI receptionist for TTC Palms, a premier tennis & pickleball club in Palm Desert, CA. Help customers with bookings, questions, and information.

Club Knowledge:
${knowledge.map(k => `- ${k}`).join('\n')}

`;

  if (history.length > 0) {
    prompt += `Recent conversation:\n${history.map(m => `${m.role === 'customer' ? 'Customer' : 'You'}: ${m.content}`).join('\n')}\n\n`;
  }

  if (toolResult) {
    prompt += `Tool Results: ${JSON.stringify(toolResult)}\n\n`;
  }

  prompt += `Customer Intent: ${intent.intent} (confidence: ${intent.confidence}%)
Rules:
- Be concise and helpful
- If the customer references something from earlier in the conversation, use that context
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
  toolResult: unknown,
  start: number
): AgentResult {
  const model = getModelConfig();

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
      toolResult,
      latency: Date.now() - start,
      requiresHuman: intent.requiresHuman,
      model: model.provider === 'template' ? 'template' : `${model.provider}:${model.model}`,
      timestamp: new Date().toISOString(),
    },
  };
}
