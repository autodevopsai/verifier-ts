import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { ProjectInfo, DetectedApiKeys } from './project-detector';
import { Config, ConfigSchema } from '../types/config';
import { ConfigLoader } from '../core/config-loader';

export interface WizardOptions {
  projectInfo: ProjectInfo;
  detectedKeys: DetectedApiKeys;
  skipSteps?: string[];
}

export interface WizardResult {
  config: Config;
  apiKey: string;
  provider: 'openai' | 'anthropic';
  selectedAgents: string[];
  installHooks: boolean;
  skipped: boolean;
}

export class SetupWizard {
  private options: WizardOptions;
  private baseDir: string;

  constructor(options: WizardOptions, baseDir: string = path.join(process.cwd(), '.verifier')) {
    this.options = options;
    this.baseDir = baseDir;
  }

  async run(): Promise<WizardResult> {
    console.log(chalk.cyan('\n🚀 AutoDevOps Verifier Quickstart'));
    console.log(chalk.gray('Setting up your project in 2 minutes or less...\n'));

    // Show project detection results
    this.showProjectInfo();

    // Check if user wants to skip setup
    if (await this.shouldSkipSetup()) {
      return this.getSkippedResult();
    }

    // Progress indicator
    let step = 1;
    const totalSteps = 4;

    // Step 1: Provider & API Key
    console.log(chalk.blue(`\n[${step}/${totalSteps}] 🔑 API Configuration`));
    const { provider, apiKey } = await this.configureApiKey();
    step++;

    // Step 2: Model Selection
    console.log(chalk.blue(`\n[${step}/${totalSteps}] 🤖 Model Selection`));
    const model = await this.selectModel(provider);
    step++;

    // Step 3: Agent Selection
    console.log(chalk.blue(`\n[${step}/${totalSteps}] 🛠️  Agent Selection`));
    const selectedAgents = await this.selectAgents();
    step++;

    // Step 4: Git Hooks
    console.log(chalk.blue(`\n[${step}/${totalSteps}] ⚡ Git Integration`));
    const installHooks = await this.configureGitHooks();

    // Create configuration
    const config: Config = ConfigSchema.parse({
      models: { primary: model },
      providers: provider === 'openai' ? { openai: {} } : { anthropic: {} },
      budgets: { 
        daily_tokens: 100000, 
        per_commit_tokens: 5000, 
        monthly_cost: 100 
      },
      thresholds: { 
        drift_score: 30, 
        security_risk: 5, 
        coverage_delta: -5 
      },
      hooks: installHooks ? { 'pre-commit': selectedAgents } : {},
    });

    return {
      config,
      apiKey,
      provider,
      selectedAgents,
      installHooks,
      skipped: false
    };
  }

  private showProjectInfo(): void {
    const { projectInfo } = this.options;
    
    console.log(chalk.green('✓ Project detected:'));
    console.log(`  ${chalk.bold(projectInfo.language)} ${projectInfo.framework ? `(${projectInfo.framework})` : ''}`);
    
    if (projectInfo.packageManager) {
      console.log(`  Package manager: ${projectInfo.packageManager}`);
    }
    
    const features = [];
    if (projectInfo.hasTests) features.push('tests');
    if (projectInfo.hasLinting) features.push('linting');
    if (projectInfo.hasTsConfig) features.push('TypeScript');
    if (features.length > 0) {
      console.log(`  Features: ${features.join(', ')}`);
    }

    // Show detected API keys
    if (this.options.detectedKeys.source !== 'none') {
      console.log(chalk.green('✓ API keys detected:'));
      const source = this.options.detectedKeys.source === 'env' ? 'environment' : 
                    this.options.detectedKeys.envFile || '.env file';
      if (this.options.detectedKeys.openai) {
        console.log(`  OpenAI (from ${source})`);
      }
      if (this.options.detectedKeys.anthropic) {
        console.log(`  Anthropic (from ${source})`);
      }
    }
  }

  private async shouldSkipSetup(): Promise<boolean> {
    // Check if already initialized
    const configExists = await fs.pathExists(path.join(this.baseDir, 'config.yaml'));
    if (configExists) {
      const { skipSetup } = await inquirer.prompt([{
        type: 'confirm',
        name: 'skipSetup',
        message: 'Verifier is already set up. Skip to running your first agent?',
        default: true
      }]);
      return skipSetup;
    }

    return false;
  }

  private async configureApiKey(): Promise<{ provider: 'openai' | 'anthropic'; apiKey: string }> {
    const { detectedKeys } = this.options;

    // If we have detected keys, ask which to use
    if (detectedKeys.source !== 'none') {
      const choices: Array<{ name: string; value: { provider: 'openai' | 'anthropic'; apiKey: string } }> = [];
      
      if (detectedKeys.openai) {
        choices.push({
          name: `OpenAI (${this.maskApiKey(detectedKeys.openai)})`,
          value: { provider: 'openai', apiKey: detectedKeys.openai }
        });
      }
      
      if (detectedKeys.anthropic) {
        choices.push({
          name: `Anthropic Claude (${this.maskApiKey(detectedKeys.anthropic)})`,
          value: { provider: 'anthropic', apiKey: detectedKeys.anthropic }
        });
      }

      choices.push({
        name: 'Enter a different API key',
        value: { provider: 'openai' as const, apiKey: '' }
      });

      const { selection } = await inquirer.prompt([{
        type: 'list',
        name: 'selection',
        message: 'Which API key would you like to use?',
        choices
      }]);

      if (selection.apiKey) {
        console.log(chalk.green(`✓ Using existing ${selection.provider} API key`));
        return selection;
      }
    }

    // No keys detected or user wants to enter new one
    const { provider } = await inquirer.prompt([{
      type: 'list',
      name: 'provider',
      message: 'Choose your AI provider:',
      choices: [
        { name: 'OpenAI (GPT-4, GPT-3.5)', value: 'openai' },
        { name: 'Anthropic (Claude)', value: 'anthropic' }
      ],
      default: 'openai'
    }]);

    const keyName = provider === 'openai' ? 'OpenAI' : 'Anthropic';
    const { apiKey } = await inquirer.prompt([{
      type: 'password',
      name: 'apiKey',
      message: `Enter your ${keyName} API key:`,
      validate: (input: string) => {
        if (!input.trim()) return 'API key is required';
        if (provider === 'openai' && !input.startsWith('sk-')) {
          return 'OpenAI API keys should start with "sk-"';
        }
        return true;
      }
    }]);

    return { provider, apiKey: apiKey.trim() };
  }

  private async selectModel(provider: 'openai' | 'anthropic'): Promise<string> {
    const models = provider === 'openai' ? [
      { name: 'GPT-4o Mini (fast, cost-effective)', value: 'gpt-4o-mini', cost: '$' },
      { name: 'GPT-4o (advanced, higher cost)', value: 'gpt-4o', cost: '$$$' },
      { name: 'GPT-3.5 Turbo (budget-friendly)', value: 'gpt-3.5-turbo', cost: '$' }
    ] : [
      { name: 'Claude 3.5 Sonnet (recommended)', value: 'claude-3-5-sonnet-20240620', cost: '$$' },
      { name: 'Claude 3 Haiku (fast, cost-effective)', value: 'claude-3-haiku-20240307', cost: '$' }
    ];

    const { model } = await inquirer.prompt([{
      type: 'list',
      name: 'model',
      message: 'Select your model:',
      choices: models.map(m => ({ 
        name: `${m.name} ${chalk.gray(m.cost)}`, 
        value: m.value 
      })),
      default: models[0].value
    }]);

    return model;
  }

  private async selectAgents(): Promise<string[]> {
    const { projectInfo } = this.options;
    
    console.log(chalk.gray(`Suggested agents for ${projectInfo.language}:`));

    const agentChoices = [
      {
        name: 'Lint Agent - Code style and quality checks',
        value: 'lint',
        checked: projectInfo.suggestedAgents.includes('lint')
      },
      {
        name: 'Security Scan - Vulnerability detection',
        value: 'security-scan',
        checked: projectInfo.suggestedAgents.includes('security-scan')
      }
    ];

    // Add test coverage agent if tests are detected
    if (projectInfo.hasTests) {
      agentChoices.push({
        name: 'Test Coverage - Analyze test completeness',
        value: 'test-coverage',
        checked: projectInfo.suggestedAgents.includes('test-coverage')
      });
    }

    const { agents } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'agents',
      message: 'Select agents to run (you can always change this later):',
      choices: agentChoices,
      validate: (input: string[]) => {
        if (input.length === 0) return 'Please select at least one agent';
        return true;
      }
    }]);

    return agents;
  }

  private async configureGitHooks(): Promise<boolean> {
    // Check if git is available
    const gitExists = await fs.pathExists(path.join(process.cwd(), '.git'));
    if (!gitExists) {
      console.log(chalk.yellow('⚠️  Not a git repository - skipping git hooks'));
      return false;
    }

    const { installHooks } = await inquirer.prompt([{
      type: 'confirm',
      name: 'installHooks',
      message: 'Install git pre-commit hooks to run agents automatically?',
      default: true
    }]);

    if (installHooks) {
      console.log(chalk.gray('Git hooks will run selected agents before each commit'));
    }

    return installHooks;
  }

  private maskApiKey(apiKey: string): string {
    if (apiKey.length <= 8) return '****';
    return apiKey.substring(0, 4) + '...' + apiKey.substring(apiKey.length - 4);
  }

  private async getSkippedResult(): Promise<WizardResult> {
    // Load existing configuration
    try {
      const config = await ConfigLoader.load();
      return {
        config,
        apiKey: '', // Will use existing
        provider: 'openai', // Default, actual provider determined from config
        selectedAgents: ['lint'], // Default fallback
        installHooks: false,
        skipped: true
      };
    } catch (e) {
      throw new Error('Failed to load existing configuration');
    }
  }

  async saveConfiguration(result: WizardResult): Promise<void> {
    // Ensure directories exist
    await fs.ensureDir(this.baseDir);
    await fs.ensureDir(path.join(this.baseDir, 'artifacts'));
    await fs.ensureDir(path.join(this.baseDir, 'sessions'));
    await fs.ensureDir(path.join(this.baseDir, 'metrics'));
    await fs.ensureDir(path.join(this.baseDir, 'logs'));

    // Save configuration
    await ConfigLoader.save(result.config);

    // Save API key if provided
    if (result.apiKey && !result.skipped) {
      const envVar = result.provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY';
      const envContent = `# Verifier CLI\n# Generated by quickstart\n${envVar}=${result.apiKey}\n`;
      const envPath = path.join(this.baseDir, '.env');
      
      await fs.writeFile(envPath, envContent, 'utf-8');
      await fs.chmod(envPath, 0o600);
    }

    console.log(chalk.green('\n✓ Configuration saved successfully!'));
  }

  showProgress(message: string, step: number, total: number): void {
    const progress = '█'.repeat(Math.floor((step / total) * 20));
    const remaining = '░'.repeat(20 - Math.floor((step / total) * 20));
    console.log(`\n${chalk.blue(`[${step}/${total}]`)} ${progress}${remaining} ${message}`);
  }
}