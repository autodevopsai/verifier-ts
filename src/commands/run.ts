import chalk from 'chalk';
import { AgentRunner } from '../core/agent-runner';
import { ContextCollector } from '../core/context-collector';
import { ConfigLoader } from '../core/config-loader';
import { AgentLoader } from '../core/agent-loader';

export async function runCommand(agentId: string, options: { files?: string[] } = {}): Promise<void> {
  const config = await ConfigLoader.load();
  const agents = await AgentLoader.loadAgents();
  if (!agents.has(agentId)) {
    console.error(chalk.red(`Agent '${agentId}' not found.`));
    console.log('Available agents:', Array.from(agents.keys()).join(', '));
    process.exitCode = 1;
    return;
  }
  const runner = new AgentRunner(config, agents);
  const contextCollector = new ContextCollector();
  const repoContext = await contextCollector.collect();
  const context = { ...repoContext } as any;
  if (options.files) context.files = options.files;
  const result = await runner.runAgent(agentId, context);
  if (result.status === 'failure') {
    console.error(chalk.red(`✗ ${agentId} failed: ${result.error}`));
    process.exitCode = 1;
    return;
  }
  console.log(chalk.green(`✓ ${agentId} completed`));
  if (result.severity) console.log('Severity:', result.severity);
  if (result.score != null) console.log('Score:', result.score);
  if (result.data) console.log('Data:', JSON.stringify(result.data, null, 2));
}


