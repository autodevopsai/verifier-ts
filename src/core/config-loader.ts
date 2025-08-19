import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import { Config, ConfigSchema } from '../types/config';
import { Logger } from '../utils/logger';

const logger = new Logger('ConfigLoader');

export class ConfigLoader {
  private static config: Config | null = null;
  private static configPath = path.join(process.cwd(), '.verifier', 'config.yaml');

  static async load(demoMode = false): Promise<Config> {
    if (this.config) return this.config;
    
    // In demo mode, return default config without requiring initialization
    if (demoMode) {
      return this.getDemoConfig();
    }
    
    if (!(await fs.pathExists(this.configPath))) {
      throw new Error('Verifier not initialized. Run `verifier init` first.');
    }
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      const raw = yaml.parse(content) ?? {};
      const result = ConfigSchema.safeParse(raw);
      if (!result.success) {
        const message = result.error.errors.map((e) => e.message).join(', ');
        throw new Error(`Invalid configuration: ${message}`);
      }
      this.config = result.data;
      return this.config;
    } catch (err) {
      logger.error('Failed to load configuration', err);
      throw err;
    }
  }

  static async save(config: Config): Promise<void> {
    const configYaml = yaml.stringify(config);
    await fs.ensureDir(path.dirname(this.configPath));
    await fs.writeFile(this.configPath, configYaml, 'utf-8');
    this.config = null;
    logger.info('Configuration saved');
  }

  static async update(key: string, value: unknown): Promise<void> {
    const config = await this.load();
    const keys = key.split('.');
    let target: any = config;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!target[k] || typeof target[k] !== 'object') target[k] = {};
      target = target[k];
    }
    target[keys[keys.length - 1]] = value as any;
    await this.save(config);
  }

  /**
   * Get default configuration for demo mode
   */
  private static getDemoConfig(): Config {
    return {
      models: {
        primary: 'gpt-4o-mini',
        fallback: 'gpt-3.5-turbo'
      },
      providers: {
        openai: { api_key: 'demo-key' },
        anthropic: { api_key: 'demo-key' }
      },
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
      hooks: {}
    };
  }
}


