import { BaseAgent, AgentContext } from '../types/agent';
import { ProviderFactory } from '../providers/provider-factory';
import { ConfigLoader } from '../core/config-loader';

export class SecurityScanAgent extends BaseAgent {
  id = 'security-scan';
  name = 'Security Scanner';
  description = 'Scans code for security vulnerabilities';
  model = 'gpt-4o-mini';
  max_tokens = 2500;

  async execute(context: AgentContext) {
    if (!context.diff) return this.createResult({ status: 'skipped', error: 'No diff available' });
    const config = await ConfigLoader.load();
    const provider = await ProviderFactory.create(this.model, config);
    const prompt = `Analyze the following code diff for security vulnerabilities.\n\n${context.diff}\n\nRespond JSON with { "risk_score": 0, "vulnerabilities": [{"type":"","severity":"critical|high|medium|low","description":"","location":"","recommendation":""}], "summary":"" }`;
    try {
      const response = await provider.complete(prompt, { json_mode: true, system_prompt: 'You are a security expert analyzing code for vulnerabilities. Be thorough but avoid false positives.', max_tokens: 1200 });
      let analysis: any;
      try { analysis = JSON.parse(response); } catch { analysis = { risk_score: 3, vulnerabilities: [], summary: response }; }
      const hasBlocking = analysis.vulnerabilities?.some((v: any) => v.severity === 'critical' || v.severity === 'high');
      return this.createResult({ score: analysis.risk_score, data: analysis, severity: hasBlocking ? 'blocking' : analysis.risk_score > 5 ? 'warning' : 'info', tokens_used: 2000, cost: 0.08 });
    } catch (error: any) {
      return this.createResult({ status: 'failure', error: error?.message ?? 'Security scan failed' });
    }
  }
}


