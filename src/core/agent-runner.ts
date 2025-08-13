import { BaseAgent, AgentContext, AgentResult } from '../types/agent';
import { Logger } from '../utils/logger';
import { Config } from '../types/config';
import { MetricsStore } from '../storage/metrics-store';

const logger = new Logger('AgentRunner');

export class AgentRunner {
  private registry: Map<string, () => BaseAgent> = new Map();
  private metrics = new MetricsStore();

  constructor(private config: Config) {}

  register(id: string, factory: () => BaseAgent): this {
    this.registry.set(id, factory);
    return this;
    }

  getAgent(id: string): BaseAgent | null {
    const factory = this.registry.get(id);
    return factory ? factory() : null;
  }

  async runAgent(id: string, context: AgentContext): Promise<AgentResult> {
    try {
      const todays = await this.metrics.getMetrics('daily');
      const used = todays.reduce((sum, m) => sum + (m.tokens_used || 0), 0);
      if (used >= (this.config.budgets?.daily_tokens ?? Number.MAX_SAFE_INTEGER)) {
        return { agent_id: id, status: 'skipped', error: 'Daily token budget exhausted', timestamp: new Date().toISOString() };
      }
    } catch {}

    const agent = this.getAgent(id);
    if (!agent) {
      return { agent_id: id, status: 'failure', error: `Agent ${id} not found`, timestamp: new Date().toISOString() };
    }

    const start = Date.now();
    try {
      const result = await agent.execute(context);
      await this.metrics.record({
        agent_id: id,
        timestamp: result.timestamp,
        tokens_used: result.tokens_used ?? 0,
        cost: result.cost ?? 0,
        result: result.status,
        duration_ms: Date.now() - start,
      });
      return result;
    } catch (err) {
      logger.error(`Agent ${id} failed`, err);
      const now = new Date().toISOString();
      await this.metrics.record({ agent_id: id, timestamp: now, tokens_used: 0, cost: 0, result: 'failure', duration_ms: Date.now() - start });
      return { agent_id: id, status: 'failure', error: 'Agent execution failed', timestamp: now };
    }
  }

  async runMultiple(ids: string[], context: AgentContext, options: { parallel?: boolean; failFast?: boolean } = {}): Promise<AgentResult[]> {
    const { parallel = true, failFast = false } = options;
    if (parallel) return Promise.all(ids.map((id) => this.runAgent(id, context)));
    const out: AgentResult[] = [];
    for (const id of ids) {
      const res = await this.runAgent(id, context);
      out.push(res);
      if (failFast && res.status === 'failure') break;
    }
    return out;
  }
}


