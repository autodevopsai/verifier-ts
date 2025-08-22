export type AgentSeverity = 'info' | 'warning' | 'blocking';

export interface AgentArtifact {
  type: string;
  path?: string;
  content?: string;
}

export interface AgentResult {
  agent_id: string;
  status: 'success' | 'failure' | 'skipped';
  error?: string;
  data?: any;
  severity?: AgentSeverity;
  tokens_used?: number;
  cost?: number;
  score?: number;
  artifacts?: AgentArtifact[];
  timestamp: string;
}

import { Tool } from './tool';
import { ToolRunner } from '../core/tool-runner';

export interface AgentContext {
  repoPath?: string;
  branch?: string;
  diff?: string;
  files?: string[];
  env?: Record<string, string>;
  demoMode?: boolean;
  toolRunner?: ToolRunner;
  [key: string]: any;
}

export abstract class BaseAgent {
  abstract id: string;
  abstract name: string;
  abstract description: string;
  abstract model: string | 'none';
  abstract max_tokens: number;
  tools: Tool[] = [];

  protected createResult(partial: Partial<Omit<AgentResult, 'agent_id' | 'timestamp'>>): AgentResult {
    return {
      agent_id: (this as any).id,
      status: partial.status ?? 'success',
      data: partial.data,
      severity: partial.severity,
      tokens_used: partial.tokens_used,
      cost: partial.cost,
      error: partial.error,
      score: partial.score,
      artifacts: partial.artifacts,
      timestamp: new Date().toISOString(),
    };
  }

  abstract execute(context: AgentContext): Promise<AgentResult>;
}


