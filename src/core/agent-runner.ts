import { BaseAgent, AgentContext, AgentResult } from '../types/agent';
import { Logger } from '../utils/logger';
import { Config } from '../types/config';
import { MetricsStore } from '../storage/metrics-store';
import { HookManager } from './hook-manager';
import { ToolRunner } from './tool-runner';
import { SessionManager } from './session-manager';

const logger = new Logger('AgentRunner');

export class AgentRunner {
  private metrics = new MetricsStore();
  private hookManager: HookManager;

  constructor(private config: Config, private agents: Map<string, new () => BaseAgent>) {
    this.hookManager = new HookManager(config);
  }

  getAgent(id: string): BaseAgent | null {
    const AgentClass = this.agents.get(id);
    return AgentClass ? new AgentClass() : null;
  }

  private getProviderFromModel(model: string): string {
    if (model.startsWith('gpt-')) return 'openai';
    if (model.startsWith('claude-')) return 'claude';
    if (model.startsWith('gemini-')) return 'gemini';
    return 'generic';
  }

  async runAgent(id: string, context: AgentContext): Promise<AgentResult> {
    const agent = this.getAgent(id);
    if (!agent) {
      return { agent_id: id, status: 'failure', error: `Agent ${id} not found`, timestamp: new Date().toISOString() };
    }
    const provider = this.getProviderFromModel(agent.model);

    const session = new SessionManager();
    session.log({ type: 'start', agent: id, context });

    const sessionStartResult = await this.hookManager.executeHooks(
      'SessionStart',
      provider,
      {
        session_id: session.sessionId,
        transcript_path: session.transcriptPath,
        cwd: process.cwd(),
        hook_event_name: 'SessionStart',
        source: 'startup',
      }
    );

    if (sessionStartResult.additionalContext) {
      // This is a simplistic way to add context. A real implementation would be more sophisticated.
      context.diff = `${context.diff || ''}\n${sessionStartResult.additionalContext}`;
      session.log({ type: 'context', source: 'hook', context: sessionStartResult.additionalContext });
    }

    try {
      const todays = await this.metrics.getMetrics('daily');
      const used = todays.reduce((sum, m) => sum + (m.tokens_used || 0), 0);
      if (used >= (this.config.budgets?.daily_tokens ?? Number.MAX_SAFE_INTEGER)) {
        return { agent_id: id, status: 'skipped', error: 'Daily token budget exhausted', timestamp: new Date().toISOString() };
      }
    } catch {}

    if (!agent) {
      return { agent_id: id, status: 'failure', error: `Agent ${id} not found`, timestamp: new Date().toISOString() };
    }

    const toolRunner = new ToolRunner(agent.tools, this.hookManager, session, provider);
    const executionContext = { ...context, toolRunner };

    const start = Date.now();
    try {
      const result = await agent.execute(executionContext);
      await this.metrics.record({
        agent_id: id,
        timestamp: result.timestamp,
        tokens_used: result.tokens_used ?? 0,
        cost: result.cost ?? 0,
        result: result.status,
        duration_ms: Date.now() - start,
      });
      session.log({ type: 'result', result });
      return result;
    } catch (err) {
      logger.error(`Agent ${id} failed`, err);
      const now = new Date().toISOString();
      const errorResult: AgentResult = { agent_id: id, status: 'failure', error: 'Agent execution failed', timestamp: now };
      await this.metrics.record({ agent_id: id, timestamp: now, tokens_used: 0, cost: 0, result: 'failure', duration_ms: Date.now() - start });
      session.log({ type: 'error', error: errorResult });
      return errorResult;
    } finally {
      await this.hookManager.executeHooks('Stop', provider, {
        session_id: session.sessionId,
        transcript_path: session.transcriptPath,
        hook_event_name: 'Stop',
        stop_hook_active: false,
      });
      session.log({ type: 'stop' });
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


