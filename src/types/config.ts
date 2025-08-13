import { z } from 'zod';

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
  hooks: z.record(z.array(z.string())).default({}),
});

export type Config = z.infer<typeof ConfigSchema>;


