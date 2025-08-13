import chalk from 'chalk';
import os from 'os';
import { ConfigLoader } from '../core/config-loader';
import fs from 'fs-extra';
import path from 'path';
import which from 'which';

type Check = { name: string; ok: boolean; message?: string };

export async function doctorCommand(): Promise<void> {
  const checks: Check[] = [];
  const baseDir = path.join(process.cwd(), '.verifier');

  // Node version
  const nodeOk = Number(process.versions.node.split('.')[0]) >= 18;
  checks.push({ name: 'Node.js >= 18', ok: nodeOk, message: process.versions.node });

  // Home dir exists
  const dirExists = await fs.pathExists(baseDir);
  checks.push({ name: 'Config directory .verifier/', ok: dirExists, message: baseDir });

  // Config file
  const configPath = path.join(baseDir, 'config.yaml');
  const configExists = await fs.pathExists(configPath);
  checks.push({ name: 'Config file present', ok: configExists, message: configPath });

  let hasProviderKey = false;
  let modelsPrimary = '';
  try {
    const config = await ConfigLoader.load();
    modelsPrimary = config.models?.primary ?? '';
    const envOpenAI = process.env.OPENAI_API_KEY;
    const envAnthropic = process.env.ANTHROPIC_API_KEY;
    const cfgOpenAI = config.providers?.openai?.api_key;
    const cfgAnthropic = config.providers?.anthropic?.api_key;
    hasProviderKey = Boolean(envOpenAI || envAnthropic || cfgOpenAI || cfgAnthropic);
  } catch (e: any) {
    checks.push({ name: 'Config parse', ok: false, message: e?.message ?? 'Failed to load config' });
  }
  checks.push({ name: 'Primary model configured', ok: !!modelsPrimary, message: modelsPrimary || 'missing' });
  checks.push({ name: 'Provider API key (OpenAI/Anthropic)', ok: hasProviderKey, message: hasProviderKey ? 'found' : 'missing' });

  // Git availability (optional)
  let gitOk = false;
  try {
    await which('git');
    gitOk = true;
  } catch (e) {}
  checks.push({ name: 'git present (optional)', ok: gitOk, message: gitOk ? 'found' : 'missing' });

  // Print results
  let failures = 0;
  console.log(chalk.cyan('\nVerifier Doctor'));
  for (const c of checks) {
    const icon = c.ok ? chalk.green('✓') : chalk.red('✗');
    if (!c.ok) failures++;
    console.log(`${icon} ${c.name}${c.message ? chalk.gray(` — ${c.message}`) : ''}`);
  }

  if (failures > 0) {
    console.log('\nTroubleshooting:');
    console.log('- Run `verifier init` to generate .verifier/config.yaml');
    console.log('- Set provider keys via `verifier init` or add OPENAI_API_KEY/ANTHROPIC_API_KEY in .verifier/.env');
    console.log('- Install Node.js >= 18');
    process.exitCode = 1;
  } else {
    console.log(chalk.green('\nAll checks passed.'));
  }
}


