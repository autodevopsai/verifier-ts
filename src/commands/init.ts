import fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';
import { Config, ConfigSchema } from '../types/config';
import { ConfigLoader } from '../core/config-loader';
import { Logger } from '../utils/logger';
import { VerifierError, createError } from '../errors/error-handler';

const logger = new Logger('init');

export async function initCommand(options: { force?: boolean } = {}): Promise<void> {
  const baseDir = path.join(process.cwd(), '.verifier');
  const configPath = path.join(baseDir, 'config.yaml');
  
  try {
    // Check if already initialized
    if (await fs.pathExists(configPath) && !options.force) {
      logger.warn('Verifier already initialized. Use --force to overwrite.');
      return;
    }

    // Check if we're in a git repository
    try {
      await fs.access(path.join(process.cwd(), '.git'));
    } catch {
      throw createError.notGitRepo();
    }

    logger.progress('Setting up verifier directories...');

    // Create directory structure
    try {
      await fs.ensureDir(baseDir);
      await fs.ensureDir(path.join(baseDir, 'artifacts'));
      await fs.ensureDir(path.join(baseDir, 'sessions'));
      await fs.ensureDir(path.join(baseDir, 'metrics'));
      await fs.ensureDir(path.join(baseDir, 'logs'));
    } catch (error) {
      if (error instanceof Error && error.message.includes('EACCES')) {
        throw createError.permissionDenied(baseDir);
      }
      throw error;
    }

    logger.info('Configuring verifier...');

    // Interactive setup
    const answers = await inquirer.prompt<{ 
      provider: 'openai' | 'anthropic'; 
      apiKey: string; 
      primaryModel: string; 
      skipApiKey?: boolean;
    }>([
      { 
        type: 'list', 
        name: 'provider', 
        message: '🤖 Choose your AI provider:', 
        choices: [
          { name: 'OpenAI (GPT models)', value: 'openai' },
          { name: 'Anthropic (Claude models)', value: 'anthropic' }
        ], 
        default: 'anthropic' 
      },
      {
        type: 'confirm',
        name: 'skipApiKey',
        message: '🔑 Do you want to set up API key now?',
        default: true
      },
      { 
        type: 'password', 
        name: 'apiKey', 
        message: '🔐 Enter your API key:',
        when: (answers) => answers.skipApiKey,
        validate: (input) => {
          if (!input?.trim()) {
            return 'API key is required';
          }
          return true;
        }
      },
      { 
        type: 'input', 
        name: 'primaryModel', 
        message: '🧠 Primary model:',
        default: (ans: { provider: 'openai' | 'anthropic' }) => 
          ans.provider === 'openai' ? 'gpt-4o-mini' : 'claude-3-5-sonnet-20240620',
        validate: (input) => {
          if (!input?.trim()) {
            return 'Model name is required';
          }
          return true;
        }
      },
    ]);

    // Create configuration
    const config: Config = ConfigSchema.parse({
      models: { primary: answers.primaryModel },
      providers: answers.provider === 'openai' ? { openai: {} } : { anthropic: {} },
      budgets: { daily_tokens: 100000, per_commit_tokens: 5000, monthly_cost: 100 },
      thresholds: { drift_score: 30, security_risk: 5, coverage_delta: -5 },
      hooks: {},
    });

    logger.progress('Saving configuration...');
    await ConfigLoader.save(config);

    // Save API key if provided
    if (answers.apiKey) {
      const envVar = answers.provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY';
      const envContent = `# Verifier CLI Environment Variables
# Keep this file secure and add it to .gitignore
${envVar}=${answers.apiKey}
`;
      
      try {
        await fs.writeFile(path.join(baseDir, '.env'), envContent, 'utf-8');
        await fs.chmod(path.join(baseDir, '.env'), 0o600);
        logger.info('API key saved securely');
      } catch (error) {
        if (error instanceof Error && error.message.includes('EACCES')) {
          throw createError.permissionDenied(path.join(baseDir, '.env'));
        }
        throw error;
      }
    }

    // Check and update .gitignore
    await ensureGitIgnore();

    logger.success('Verifier initialized successfully!');
    
    if (!answers.apiKey) {
      logger.warn('⚠️  No API key configured. Set one later with: verifier config --key YOUR_KEY');
    }
    
    logger.info('💡 Next steps:');
    console.log('  • Run "verifier doctor" to verify setup');
    console.log('  • Run "verifier list" to see available agents');
    console.log('  • Run "verifier demo" to try without API keys');

  } catch (error) {
    if (error instanceof VerifierError) {
      throw error;
    }
    
    // Handle configuration parsing errors
    if (error instanceof Error && error.message.includes('validation')) {
      throw new VerifierError({
        code: 'CONFIG_INVALID',
        message: 'Configuration validation failed',
        cause: error,
        context: { step: 'config_creation' }
      });
    }
    
    // Handle file system errors
    if (error instanceof Error && error.message.includes('ENOENT')) {
      throw createError.fileNotFound(baseDir);
    }
    
    throw error;
  }
}

/**
 * Ensure .verifier directory is added to .gitignore
 */
async function ensureGitIgnore(): Promise<void> {
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  const verifierEntry = '.verifier/';
  
  try {
    let gitignoreContent = '';
    
    // Read existing .gitignore if it exists
    if (await fs.pathExists(gitignorePath)) {
      gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
    }
    
    // Check if .verifier is already in .gitignore
    if (!gitignoreContent.includes(verifierEntry)) {
      const newContent = gitignoreContent 
        ? `${gitignoreContent}\n\n# Verifier CLI\n${verifierEntry}\n`
        : `# Verifier CLI\n${verifierEntry}\n`;
      
      await fs.writeFile(gitignorePath, newContent, 'utf-8');
      logger.info('Added .verifier/ to .gitignore');
    }
  } catch (error) {
    // Non-critical error, just warn
    logger.warn('Could not update .gitignore. Please manually add ".verifier/" to your .gitignore file.');
  }
}


