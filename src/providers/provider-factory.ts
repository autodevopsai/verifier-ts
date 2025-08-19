import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { Config } from '../types/config';
import { DemoProvider } from './demo-provider';

export interface CompletionOptions {
  json_mode?: boolean;
  system_prompt?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface LLMProvider {
  complete(prompt: string, options?: CompletionOptions): Promise<string>;
}

class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;
  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }
  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    const res = await this.client.chat.completions.create({
      model: this.model,
      temperature: options?.temperature ?? 0.2,
      messages: [
        options?.system_prompt ? { role: 'system', content: options.system_prompt } : null,
        { role: 'user', content: prompt },
      ].filter(Boolean) as any,
      response_format: options?.json_mode ? { type: 'json_object' as const } : undefined,
      max_tokens: options?.max_tokens,
    });
    return res.choices[0]?.message?.content ?? '';
  }
}

class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private model: string;
  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }
  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    const res = await this.client.messages.create({
      model: this.model,
      temperature: options?.temperature ?? 0.2,
      max_tokens: options?.max_tokens ?? 1024,
      system: options?.system_prompt,
      messages: [{ role: 'user', content: prompt }],
    });
    const content = res.content?.[0] as any;
    return typeof content?.text === 'string' ? content.text : JSON.stringify(res);
  }
}

export class ProviderFactory {
  static async create(model: string, config: Config, demoMode = false): Promise<LLMProvider> {
    // Return demo provider when in demo mode
    if (demoMode) {
      return new DemoProvider();
    }

    const useOpenAI = model.startsWith('gpt') || !!config.providers.openai?.api_key;
    if (useOpenAI && config.providers.openai?.api_key) {
      return new OpenAIProvider(config.providers.openai.api_key, model);
    }
    if (config.providers.anthropic?.api_key) {
      return new AnthropicProvider(config.providers.anthropic.api_key, model);
    }
    throw new Error('No provider API key configured. Set providers.openai.api_key or providers.anthropic.api_key.');
  }
}


