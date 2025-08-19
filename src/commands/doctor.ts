import chalk from 'chalk';
import os from 'os';
import { ConfigLoader } from '../core/config-loader';
import fs from 'fs-extra';
import path from 'path';
import which from 'which';
import { Logger } from '../utils/logger';
import { VerifierError, createError } from '../errors/error-handler';

const logger = new Logger('doctor');

type Check = { 
  name: string; 
  ok: boolean; 
  message?: string; 
  severity: 'critical' | 'warning' | 'info';
  suggestion?: string;
};

export async function doctorCommand(): Promise<void> {
  try {
    logger.info('🩺 Running system diagnostics...');
    
    const checks: Check[] = [];
    const baseDir = path.join(process.cwd(), '.verifier');

    // Node.js version check
    const nodeVersion = Number(process.versions.node.split('.')[0]);
    const nodeOk = nodeVersion >= 18;
    checks.push({ 
      name: 'Node.js version', 
      ok: nodeOk, 
      message: `v${process.versions.node}`,
      severity: nodeOk ? 'info' : 'critical',
      suggestion: nodeOk ? undefined : 'Install Node.js >= 18 from https://nodejs.org/'
    });

    // System information
    const platform = os.platform();
    const arch = os.arch();
    const totalMem = Math.round(os.totalmem() / 1024 / 1024 / 1024);
    const freeMem = Math.round(os.freemem() / 1024 / 1024 / 1024);
    
    checks.push({
      name: 'System info',
      ok: true,
      message: `${platform} ${arch}, ${freeMem}/${totalMem}GB RAM`,
      severity: 'info'
    });

    // Memory check
    const memoryOk = freeMem >= 1;
    checks.push({
      name: 'Available memory',
      ok: memoryOk,
      message: `${freeMem}GB free`,
      severity: memoryOk ? 'info' : 'warning',
      suggestion: memoryOk ? undefined : 'Consider freeing up memory for better performance'
    });

    // Directory structure check
    const dirExists = await fs.pathExists(baseDir);
    checks.push({ 
      name: 'Verifier directory', 
      ok: dirExists, 
      message: dirExists ? baseDir : 'not found',
      severity: dirExists ? 'info' : 'critical',
      suggestion: dirExists ? undefined : 'Run "verifier init" to create .verifier/ directory'
    });

    // Required subdirectories
    if (dirExists) {
      const subdirs = ['artifacts', 'sessions', 'metrics', 'logs'];
      for (const subdir of subdirs) {
        const subdirPath = path.join(baseDir, subdir);
        const subdirExists = await fs.pathExists(subdirPath);
        checks.push({
          name: `${subdir} directory`,
          ok: subdirExists,
          message: subdirExists ? 'present' : 'missing',
          severity: subdirExists ? 'info' : 'warning',
          suggestion: subdirExists ? undefined : `Directory will be created automatically`
        });
      }
    }

    // Configuration file check
    const configPath = path.join(baseDir, 'config.yaml');
    const configExists = await fs.pathExists(configPath);
    checks.push({ 
      name: 'Configuration file', 
      ok: configExists, 
      message: configExists ? 'present' : 'missing',
      severity: configExists ? 'info' : 'critical',
      suggestion: configExists ? undefined : 'Run "verifier init" to create configuration'
    });

    // Configuration validation
    let config: any = null;
    let hasProviderKey = false;
    let modelsPrimary = '';
    let configParseOk = true;
    
    if (configExists) {
      try {
        config = await ConfigLoader.load();
        modelsPrimary = config.models?.primary ?? '';
        
        // Check for API keys
        const envOpenAI = process.env.OPENAI_API_KEY;
        const envAnthropic = process.env.ANTHROPIC_API_KEY;
        const cfgOpenAI = config.providers?.openai?.api_key;
        const cfgAnthropic = config.providers?.anthropic?.api_key;
        hasProviderKey = Boolean(envOpenAI || envAnthropic || cfgOpenAI || cfgAnthropic);
        
      } catch (error: any) {
        configParseOk = false;
        checks.push({ 
          name: 'Configuration parsing', 
          ok: false, 
          message: error?.message ?? 'Failed to parse config',
          severity: 'critical',
          suggestion: 'Run "verifier init --force" to recreate configuration'
        });
      }
    }

    if (configParseOk && config) {
      checks.push({ 
        name: 'Configuration parsing', 
        ok: true, 
        message: 'valid',
        severity: 'info'
      });

      checks.push({ 
        name: 'Primary model', 
        ok: !!modelsPrimary, 
        message: modelsPrimary || 'not configured',
        severity: modelsPrimary ? 'info' : 'critical',
        suggestion: modelsPrimary ? undefined : 'Set primary model in configuration'
      });

      checks.push({ 
        name: 'API key', 
        ok: hasProviderKey, 
        message: hasProviderKey ? 'configured' : 'missing',
        severity: hasProviderKey ? 'info' : 'critical',
        suggestion: hasProviderKey ? undefined : 'Set API key with "verifier config --key YOUR_KEY"'
      });
    }

    // Git repository check
    let gitRepoOk = false;
    try {
      await fs.access(path.join(process.cwd(), '.git'));
      gitRepoOk = true;
    } catch (e) {}
    
    checks.push({ 
      name: 'Git repository', 
      ok: gitRepoOk, 
      message: gitRepoOk ? 'detected' : 'not found',
      severity: gitRepoOk ? 'info' : 'warning',
      suggestion: gitRepoOk ? undefined : 'Initialize git repository for better context collection'
    });

    // Git binary check
    let gitBinaryOk = false;
    try {
      await which('git');
      gitBinaryOk = true;
    } catch (e) {}
    
    checks.push({ 
      name: 'Git binary', 
      ok: gitBinaryOk, 
      message: gitBinaryOk ? 'available' : 'not found',
      severity: gitBinaryOk ? 'info' : 'warning',
      suggestion: gitBinaryOk ? undefined : 'Install git for repository context collection'
    });

    // Environment file check
    const envPath = path.join(baseDir, '.env');
    const envExists = await fs.pathExists(envPath);
    checks.push({
      name: 'Environment file',
      ok: envExists || hasProviderKey,
      message: envExists ? 'present' : 'not found',
      severity: (envExists || hasProviderKey) ? 'info' : 'warning',
      suggestion: envExists ? undefined : 'Environment variables can be set in .verifier/.env'
    });

    // Network connectivity check
    let networkOk = false;
    try {
      // Simple DNS resolution test
      const dns = require('dns').promises;
      await dns.resolve('api.anthropic.com');
      networkOk = true;
    } catch (e) {}
    
    checks.push({
      name: 'Network connectivity',
      ok: networkOk,
      message: networkOk ? 'available' : 'limited',
      severity: networkOk ? 'info' : 'warning',
      suggestion: networkOk ? undefined : 'Check internet connection for API access'
    });

    // Display results
    logger.info('📋 Diagnostic Results:');
    console.log('');
    
    let criticalIssues = 0;
    let warnings = 0;
    
    for (const check of checks) {
      const { icon, color } = getCheckDisplay(check);
      
      if (!check.ok) {
        if (check.severity === 'critical') criticalIssues++;
        else if (check.severity === 'warning') warnings++;
      }
      
      console.log(`${icon} ${check.name}${check.message ? chalk.gray(` — ${check.message}`) : ''}`);
      
      if (!check.ok && check.suggestion) {
        console.log(`   ${chalk.cyan('💡')} ${chalk.cyan(check.suggestion)}`);
      }
    }

    // Summary and recommendations
    console.log('');
    
    if (criticalIssues === 0 && warnings === 0) {
      logger.success('All checks passed! Verifier is ready to use.');
      console.log(chalk.green('\n🚀 Quick start:'));
      console.log('  • verifier run security-scan');
      console.log('  • verifier run lint');
      console.log('  • verifier demo  # Try without API keys');
    } else {
      if (criticalIssues > 0) {
        logger.error(`Found ${criticalIssues} critical issue(s) that need attention.`);
      }
      if (warnings > 0) {
        logger.warn(`Found ${warnings} warning(s) that could affect performance.`);
      }
      
      console.log(chalk.yellow('\n🔧 Quick fixes:'));
      if (!dirExists || !configExists) {
        console.log(chalk.blue('  verifier init  # Set up configuration'));
      }
      if (!hasProviderKey) {
        console.log(chalk.blue('  verifier config --key YOUR_API_KEY  # Add API key'));
      }
      if (!nodeOk) {
        console.log(chalk.blue('  # Install Node.js >= 18 from https://nodejs.org/'));
      }
      
      console.log(chalk.gray('\n📚 Documentation: https://autodevops.ai/docs/cli/troubleshooting'));
      
      if (criticalIssues > 0) {
        throw new VerifierError({
          code: 'CONFIG_INVALID',
          message: `Doctor found ${criticalIssues} critical issue(s)`,
          context: { criticalIssues, warnings, checks: checks.length }
        });
      }
    }

  } catch (error) {
    if (error instanceof VerifierError) {
      throw error;
    }
    
    throw new VerifierError({
      code: 'UNKNOWN_ERROR',
      message: 'Failed to run diagnostics',
      cause: error as Error,
      context: { command: 'doctor' }
    });
  }
}

/**
 * Get display icon and color for check result
 */
function getCheckDisplay(check: Check): { icon: string; color: string } {
  if (check.ok) {
    return { icon: chalk.green('✅'), color: 'green' };
  }
  
  switch (check.severity) {
    case 'critical':
      return { icon: chalk.red('❌'), color: 'red' };
    case 'warning':
      return { icon: chalk.yellow('⚠️'), color: 'yellow' };
    default:
      return { icon: chalk.blue('ℹ️'), color: 'blue' };
  }
}


