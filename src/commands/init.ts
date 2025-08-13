import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { Config, ConfigSchema } from '../types/config';
import { ConfigLoader } from '../core/config-loader';

export async function initCommand(options: { force?: boolean } = {}): Promise<void> {
  const baseDir = path.join(process.cwd(), '.verifier');
  const configPath = path.join(baseDir, 'config.yaml');
  if (await fs.pathExists(configPath) && !options.force) {
    console.log(chalk.yellow('Verifier already initialized. Use --force to overwrite.'));
    return;
  }
  await fs.ensureDir(baseDir);
  await fs.ensureDir(path.join(baseDir, 'artifacts'));
  await fs.ensureDir(path.join(baseDir, 'sessions'));
  await fs.ensureDir(path.join(baseDir, 'metrics'));
  await fs.ensureDir(path.join(baseDir, 'logs'));

  const answers = await inquirer.prompt<{ provider: 'openai' | 'anthropic'; apiKey: string; primaryModel: string }>([
    { type: 'list', name: 'provider', message: 'Default provider', choices: ['openai', 'anthropic'], default: 'openai' },
    { type: 'password', name: 'apiKey', message: 'API key' },
    { type: 'input', name: 'primaryModel', message: 'Primary model', default: (ans: { provider: 'openai' | 'anthropic' }) => (ans.provider === 'openai' ? 'gpt-4o-mini' : 'claude-3-5-sonnet-20240620') },
  ]);

  const config: Config = ConfigSchema.parse({
    models: { primary: answers.primaryModel },
    providers: answers.provider === 'openai' ? { openai: { api_key: answers.apiKey } } : { anthropic: { api_key: answers.apiKey } },
    budgets: { daily_tokens: 100000, per_commit_tokens: 5000, monthly_cost: 100 },
    thresholds: { drift_score: 30, security_risk: 5, coverage_delta: -5 },
    hooks: {},
  });

  await ConfigLoader.save(config);
  await fs.writeFile(path.join(baseDir, '.env'), `# Verifier CLI\n# Add additional env here\n`, 'utf-8');
  console.log(chalk.green('✓ Verifier initialized at .verifier/'));
}


