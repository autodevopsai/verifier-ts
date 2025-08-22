import { z } from 'zod';

const HookSetSchema = z.object({
  PreToolUse: z.array(z.object({ matcher: z.string().optional(), hooks: z.array(z.object({ type: z.literal('command'), command: z.string(), timeout: z.number().optional() })) })).optional(),
  PostToolUse: z.array(z.object({ matcher: z.string().optional(), hooks: z.array(z.object({ type: z.literal('command'), command: z.string(), timeout: z.number().optional() })) })).optional(),
  Notification: z.array(z.object({ matcher: z.string().optional(), hooks: z.array(z.object({ type: z.literal('command'), command: z.string(), timeout: z.number().optional() })) })).optional(),
  UserPromptSubmit: z.array(z.object({ matcher: z.string().optional(), hooks: z.array(z.object({ type: z.literal('command'), command: z.string(), timeout: z.number().optional() })) })).optional(),
  Stop: z.array(z.object({ matcher: z.string().optional(), hooks: z.array(z.object({ type: z.literal('command'), command: z.string(), timeout: z.number().optional() })) })).optional(),
  SubagentStop: z.array(z.object({ matcher: z.string().optional(), hooks: z.array(z.object({ type: z.literal('command'), command: z.string(), timeout: z.number().optional() })) })).optional(),
  PreCompact: z.array(z.object({ matcher: z.string().optional(), hooks: z.array(z.object({ type: z.literal('command'), command: z.string(), timeout: z.number().optional() })) })).optional(),
  SessionStart: z.array(z.object({ matcher: z.string().optional(), hooks: z.array(z.object({ type: z.literal('command'), command: z.string(), timeout: z.number().optional() })) })).optional(),
});

export const ConfigSchema = z.object({
  models: z.object({
    primary: z.string(),
    fallback: z.string().optional(),
  }),
  providers: z
    .object({
      openai: z.object({ api_key: z.string().optional() }).optional(),
      anthropic: z.object({ api_key: z.string().optional() }).optional(),
    })
    .default({}),
  budgets: z.object({
    daily_tokens: z.number().int().nonnegative().default(100000),
    per_commit_tokens: z.number().int().nonnegative().default(5000),
    monthly_cost: z.number().nonnegative().default(100),
  }),
  thresholds: z
    .object({
      drift_score: z.number().int().min(0).max(100).default(30),
      security_risk: z.number().int().min(0).max(10).default(5),
      coverage_delta: z.number().int().default(-5),
    })
    .default({}),
  hooks: z.object({
    generic: HookSetSchema.optional(),
    claude: HookSetSchema.optional(),
    gemini: HookSetSchema.optional(),
    openai: HookSetSchema.optional(),
  }).default({}),
});

export type Config = z.infer<typeof ConfigSchema>;
export type HookSet = z.infer<typeof HookSetSchema>;


