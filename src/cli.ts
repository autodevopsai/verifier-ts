#!/usr/bin/env node
import { Command } from 'commander';
import dotenv from 'dotenv';
import { initCommand } from './commands/init';
import { runCommand } from './commands/run';
import { tokenUsageCommand } from './commands/token-usage';
import { doctorCommand } from './commands/doctor';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.verifier', '.env') });

const program = new Command();
program
  .name('verifier')
  .description('Verifier CLI tool')
  .version('0.1.0');

program.command('init').description('Initialize verifier in this repo').option('--force', 'Overwrite').action((opts) => initCommand(opts));

program
  .command('run')
  .description('Run a verifier agent')
  .argument('<agent>', 'Agent id (lint, security-scan)')
  .option('-f, --files <files...>')
  .action((agent, opts) => runCommand(agent, opts));

program
  .command('token-usage')
  .description('Show token usage')
  .option('-p, --period <period>', 'hourly|daily|weekly|monthly', 'daily')
  .option('--format <format>', 'table|json', 'table')
  .action((opts) => tokenUsageCommand(opts));

program
  .command('doctor')
  .description('Verify environment/config before running agents')
  .action(() => doctorCommand());

program.parseAsync(process.argv);


