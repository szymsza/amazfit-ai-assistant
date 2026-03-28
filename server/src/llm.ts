export type Message = { role: 'user' | 'assistant'; content: string };

export type LLMProviderFn = (
  messages: Message[],
  model: string,
  apiKey: string,
) => Promise<string>;

const registry: Record<string, LLMProviderFn> = {};

export function registerProvider(name: string, fn: LLMProviderFn): void {
  registry[name] = fn;
}

export interface LLMCallOptions {
  provider: string;
  model: string;
  apiKey: string;
  messages: Message[];
  maxTurns?: number;
}

export async function callLLM(options: LLMCallOptions): Promise<string> {
  const { provider, model, apiKey, messages, maxTurns = 10 } = options;

  const fn = registry[provider];
  if (!fn) {
    throw new Error(`Unknown LLM provider: ${provider}`);
  }

  // Cap conversation history to the last maxTurns messages
  const capped = messages.length > maxTurns ? messages.slice(-maxTurns) : messages;

  return fn(capped, model, apiKey);
}
