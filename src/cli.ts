#!/usr/bin/env node
import { Command } from 'commander';
import dotenv from 'dotenv';
import path from 'path';
import { initCommand } from './commands/init';
import { runCommand } from './commands/run';
import { tokenUsageCommand } from './commands/token-usage';
import { doctorCommand } from './commands/doctor';
import { demoCommand } from './commands/demo';
import { quickstartCommand } from './commands/quickstart';
import { ErrorHandler, VerifierError } from './errors/error-handler';
import { Logger } from './utils/logger';
import { findBestMatch, AVAILABLE_COMMANDS } from './errors/suggestions';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.verifier', '.env') });

// Setup global error handlers
ErrorHandler.setupGlobalHandlers();

const program = new Command();
program
  .name('verifier')
  .description('AI-powered code verification CLI')
  .version('0.1.0')
  .option('-v, --verbose', 'Enable verbose output')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.verbose) {
      Logger.setVerbose(true);
      ErrorHandler.setVerbose(true);
    }
  });

program
  .command('quickstart')
  .description('🚀 One-command setup and first agent run')
  .action(async () => {
    try {
      await quickstartCommand();
    } catch (error) {
      ErrorHandler.handleAny(error, { command: 'quickstart' });
    }
  });

program
  .command('init')
  .description('Initialize verifier in this repository')
  .option('--force', 'Overwrite existing configuration')
  .action(async (opts) => {
    try {
      await initCommand(opts);
    } catch (error) {
      ErrorHandler.handleAny(error, { command: 'init', options: opts });
    }
  });

program
  .command('run')
  .description('Run a verifier agent')
  .argument('<agent>', 'Agent ID (lint, security-scan, test-coverage)')
  .option('-f, --files <files...>', 'Specific files to analyze')
  .option('--demo', 'Run in demo mode without API keys')
  .action(async (agent, opts) => {
    try {
      await runCommand(agent, opts);
    } catch (error) {
      ErrorHandler.handleAny(error, { command: 'run', agent, options: opts });
    }
  });

program
  .command('token-usage')
  .description('Show token usage statistics')
  .option('-p, --period <period>', 'Time period (hourly|daily|weekly|monthly)', 'daily')
  .option('--format <format>', 'Output format (table|json)', 'table')
  .action(async (opts) => {
    try {
      await tokenUsageCommand(opts);
    } catch (error) {
      ErrorHandler.handleAny(error, { command: 'token-usage', options: opts });
    }
  });

program
  .command('doctor')
  .description('Verify environment and configuration')
  .action(async () => {
    try {
      await doctorCommand();
    } catch (error) {
      ErrorHandler.handleAny(error, { command: 'doctor' });
    }
  });

program
  .command('demo')
  .description('🎬 Interactive demo - no setup required!')
  .option('-a, --agent <agent>', 'Specific agent to demo (security-scan, lint)', 'security-scan')
  .action(async (opts) => {
    try {
      await demoCommand(opts);
    } catch (error) {
      ErrorHandler.handleAny(error, { command: 'demo', options: opts });
    }
  });

// Add list command for showing available agents
program
  .command('list')
  .description('List all available agents')
  .action(async () => {
    try {
      const { AgentLoader } = await import('./core/agent-loader');
      const agents = await AgentLoader.loadAgents();
      const entries: { id: string; name: string; description: string }[] = [];
      for (const [id, AgentCtor] of agents) {
        try {
          const instance: any = new (AgentCtor as any)();
          entries.push({ id, name: instance.name ?? id, description: instance.description ?? '' });
        } catch {
          entries.push({ id, name: id, description: '' });
        }
      }
      if (entries.length === 0) {
        console.log('📋 No agents found. Add agent files under packages/verifier/src/agents/*.');
        return;
      }
      console.log(`📋 Available agents (${entries.length}):`);
      for (const e of entries.sort((a, b) => a.id.localeCompare(b.id))) {
        console.log(`  • ${e.id} — ${e.name}${e.description ? ` — ${e.description}` : ''}`);
      }
    } catch (error) {
      ErrorHandler.handleAny(error, { command: 'list' });
    }
  });

// Add hooks command for listing hooks
program
  .command('hooks')
  .description('List all configured hooks')
  .action(async () => {
    try {
      const { ConfigLoader } = await import('./core/config-loader');
      const config = await ConfigLoader.load();
      const hooks = (config as any).hooks || {};
      const providers = ['generic', 'claude', 'openai', 'gemini'] as const;
      const summarize = (obj: any) =>
        Object.keys(obj || {}).map((event) => `${event}(${(obj[event] || []).length})`).join(', ');

      let total = 0;
      for (const p of providers) {
        const events = hooks[p] || {};
        const eventKeys = Object.keys(events);
        total += eventKeys.reduce((n, k) => n + (events[k]?.length || 0), 0);
      }

      if (!total) {
        console.log('🔧 No hooks configured. Create .verifier/config.yaml and add a hooks section.');
        console.log('See docs/hooks.md for an example.');
        return;
      }
      console.log('🔧 Configured hooks:');
      for (const p of providers) {
        const summary = summarize(hooks[p] || {});
        if (summary) console.log(`  • ${p}: ${summary}`);
      }
    } catch (error) {
      const msg = (error as any)?.message || '';
      if (msg.includes('Verifier not initialized')) {
        console.log('ℹ️  Verifier is not initialized in this repo.');
        console.log('Run `verifier init` or check docs/hooks.md for setup.');
        return;
      }
      ErrorHandler.handleAny(error, { command: 'hooks' });
    }
  });

// Add config command for managing configuration
program
  .command('config')
  .description('Manage verifier configuration')
  .option('--key <key>', 'Set API key')
  .option('--budget <amount>', 'Set monthly budget limit')
  .option('--show', 'Show current configuration')
  .action(async (opts) => {
    try {
      // TODO: Implement config management
      console.log('🔧 Configuration management coming soon...');
      if (opts.show) {
        const { ConfigLoader } = await import('./core/config-loader');
        const config = await ConfigLoader.load();
        console.log(JSON.stringify(config, null, 2));
      }
    } catch (error) {
      ErrorHandler.handleAny(error, { command: 'config', options: opts });
    }
  });

// Enhanced error handling for unknown commands
program.on('command:*', (operands) => {
  const unknownCommand = operands[0];
  const suggestion = findBestMatch(unknownCommand, AVAILABLE_COMMANDS);
  
  const error = new VerifierError({
    code: 'AGENT_NOT_FOUND', // Reusing this code for unknown commands
    message: `Unknown command: ${unknownCommand}`,
    context: { 
      userInput: unknownCommand, 
      availableOptions: AVAILABLE_COMMANDS 
    },
    suggestion: suggestion ? `Did you mean: verifier ${suggestion}` : undefined,
    quickFix: 'verifier --help'
  });
  
  ErrorHandler.handle(error);
});

// Parse command line arguments with error handling
async function main() {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    ErrorHandler.handleAny(error, { command: 'main' });
  }
}

main();
