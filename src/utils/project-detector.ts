import fs from 'fs-extra';
import path from 'path';

export interface ProjectInfo {
  type: 'javascript' | 'typescript' | 'python' | 'go' | 'rust' | 'java' | 'unknown';
  framework?: string;
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'pip' | 'cargo' | 'go' | 'maven' | 'gradle';
  hasTests?: boolean;
  hasLinting?: boolean;
  hasTsConfig?: boolean;
  hasGitignore?: boolean;
  hasEnvFiles?: string[];
  suggestedAgents: string[];
  language: string;
  description: string;
}

export interface DetectedApiKeys {
  openai?: string;
  anthropic?: string;
  source: 'env' | 'dotenv' | 'none';
  envFile?: string;
}

export class ProjectDetector {
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
  }

  async detectProject(): Promise<ProjectInfo> {
    const packageJsonPath = path.join(this.cwd, 'package.json');
    const pyprojectPath = path.join(this.cwd, 'pyproject.toml');
    const requirementsPath = path.join(this.cwd, 'requirements.txt');
    const goModPath = path.join(this.cwd, 'go.mod');
    const cargoPath = path.join(this.cwd, 'Cargo.toml');
    const pomPath = path.join(this.cwd, 'pom.xml');
    const gradlePath = path.join(this.cwd, 'build.gradle');
    const gradleKtsPath = path.join(this.cwd, 'build.gradle.kts');

    // Check for different project types
    if (await fs.pathExists(packageJsonPath)) {
      return this.detectJavaScriptProject();
    } else if (await fs.pathExists(pyprojectPath) || await fs.pathExists(requirementsPath)) {
      return this.detectPythonProject();
    } else if (await fs.pathExists(goModPath)) {
      return this.detectGoProject();
    } else if (await fs.pathExists(cargoPath)) {
      return this.detectRustProject();
    } else if (await fs.pathExists(pomPath) || await fs.pathExists(gradlePath) || await fs.pathExists(gradleKtsPath)) {
      return this.detectJavaProject();
    }

    return this.detectGenericProject();
  }

  private async detectJavaScriptProject(): Promise<ProjectInfo> {
    const packageJsonPath = path.join(this.cwd, 'package.json');
    const tsConfigPath = path.join(this.cwd, 'tsconfig.json');
    const hasTsConfig = await fs.pathExists(tsConfigPath);
    
    let packageJson: any = {};
    try {
      packageJson = await fs.readJson(packageJsonPath);
    } catch (e) {
      // Ignore parse errors
    }

    // Detect framework
    let framework = 'vanilla';
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (deps.next) framework = 'Next.js';
    else if (deps.react) framework = 'React';
    else if (deps.vue) framework = 'Vue.js';
    else if (deps.angular || deps['@angular/core']) framework = 'Angular';
    else if (deps.svelte) framework = 'Svelte';
    else if (deps.express) framework = 'Express';
    else if (deps.fastify) framework = 'Fastify';
    else if (deps['@nestjs/core']) framework = 'NestJS';

    // Detect package manager
    let packageManager: 'npm' | 'yarn' | 'pnpm' = 'npm';
    if (await fs.pathExists(path.join(this.cwd, 'yarn.lock'))) packageManager = 'yarn';
    else if (await fs.pathExists(path.join(this.cwd, 'pnpm-lock.yaml'))) packageManager = 'pnpm';

    // Detect testing and linting
    const hasTests = !!(deps.jest || deps.vitest || deps.mocha || deps.cypress || deps.playwright || packageJson.scripts?.test);
    const hasLinting = !!(deps.eslint || deps.prettier || packageJson.scripts?.lint);

    // Suggested agents based on project characteristics
    const suggestedAgents = ['lint'];
    if (hasTests) suggestedAgents.push('test-coverage');
    if (hasTsConfig || framework !== 'vanilla') suggestedAgents.push('security-scan');

    return {
      type: hasTsConfig ? 'typescript' : 'javascript',
      framework,
      packageManager,
      hasTests,
      hasLinting,
      hasTsConfig,
      hasGitignore: await fs.pathExists(path.join(this.cwd, '.gitignore')),
      hasEnvFiles: await this.findEnvFiles(),
      suggestedAgents,
      language: hasTsConfig ? 'TypeScript' : 'JavaScript',
      description: `${hasTsConfig ? 'TypeScript' : 'JavaScript'} ${framework} project`
    };
  }

  private async detectPythonProject(): Promise<ProjectInfo> {
    const pyprojectPath = path.join(this.cwd, 'pyproject.toml');
    const requirementsPath = path.join(this.cwd, 'requirements.txt');
    
    // Detect framework
    let framework = 'python';
    try {
      if (await fs.pathExists(pyprojectPath)) {
        const content = await fs.readFile(pyprojectPath, 'utf-8');
        if (content.includes('django')) framework = 'Django';
        else if (content.includes('flask')) framework = 'Flask';
        else if (content.includes('fastapi')) framework = 'FastAPI';
        else if (content.includes('streamlit')) framework = 'Streamlit';
      } else if (await fs.pathExists(requirementsPath)) {
        const content = await fs.readFile(requirementsPath, 'utf-8');
        if (content.includes('django')) framework = 'Django';
        else if (content.includes('flask')) framework = 'Flask';
        else if (content.includes('fastapi')) framework = 'FastAPI';
        else if (content.includes('streamlit')) framework = 'Streamlit';
      }
    } catch (e) {
      // Ignore parse errors
    }

    const hasTests = await fs.pathExists(path.join(this.cwd, 'tests')) || 
                    await fs.pathExists(path.join(this.cwd, 'test'));

    return {
      type: 'python',
      framework,
      packageManager: 'pip',
      hasTests,
      hasLinting: await fs.pathExists(path.join(this.cwd, '.pylintrc')) ||
                  await fs.pathExists(path.join(this.cwd, 'pyproject.toml')),
      hasTsConfig: false,
      hasGitignore: await fs.pathExists(path.join(this.cwd, '.gitignore')),
      hasEnvFiles: await this.findEnvFiles(),
      suggestedAgents: ['lint', 'security-scan'],
      language: 'Python',
      description: `Python ${framework} project`
    };
  }

  private async detectGoProject(): Promise<ProjectInfo> {
    return {
      type: 'go',
      framework: 'Go',
      packageManager: 'go',
      hasTests: await this.hasGoTests(),
      hasLinting: false, // Go has built-in formatting
      hasTsConfig: false,
      hasGitignore: await fs.pathExists(path.join(this.cwd, '.gitignore')),
      hasEnvFiles: await this.findEnvFiles(),
      suggestedAgents: ['lint', 'security-scan'],
      language: 'Go',
      description: 'Go project'
    };
  }

  private async detectRustProject(): Promise<ProjectInfo> {
    return {
      type: 'rust',
      framework: 'Rust',
      packageManager: 'cargo',
      hasTests: true, // Rust has built-in testing
      hasLinting: true, // Rust has built-in linting
      hasTsConfig: false,
      hasGitignore: await fs.pathExists(path.join(this.cwd, '.gitignore')),
      hasEnvFiles: await this.findEnvFiles(),
      suggestedAgents: ['security-scan'],
      language: 'Rust',
      description: 'Rust project'
    };
  }

  private async detectJavaProject(): Promise<ProjectInfo> {
    const pomPath = path.join(this.cwd, 'pom.xml');
    const gradlePath = path.join(this.cwd, 'build.gradle');
    const gradleKtsPath = path.join(this.cwd, 'build.gradle.kts');

    let packageManager: 'maven' | 'gradle' = 'maven';
    if (await fs.pathExists(gradlePath) || await fs.pathExists(gradleKtsPath)) {
      packageManager = 'gradle';
    }

    return {
      type: 'java',
      framework: 'Java',
      packageManager,
      hasTests: await fs.pathExists(path.join(this.cwd, 'src', 'test')),
      hasLinting: false,
      hasTsConfig: false,
      hasGitignore: await fs.pathExists(path.join(this.cwd, '.gitignore')),
      hasEnvFiles: await this.findEnvFiles(),
      suggestedAgents: ['lint', 'security-scan'],
      language: 'Java',
      description: `Java project (${packageManager})`
    };
  }

  private async detectGenericProject(): Promise<ProjectInfo> {
    return {
      type: 'unknown',
      hasGitignore: await fs.pathExists(path.join(this.cwd, '.gitignore')),
      hasEnvFiles: await this.findEnvFiles(),
      suggestedAgents: ['lint'],
      language: 'Generic',
      description: 'Generic project'
    };
  }

  private async findEnvFiles(): Promise<string[]> {
    const envFiles = ['.env', '.env.local', '.env.development', '.env.production', '.env.example'];
    const found: string[] = [];
    
    for (const file of envFiles) {
      if (await fs.pathExists(path.join(this.cwd, file))) {
        found.push(file);
      }
    }
    
    return found;
  }

  private async hasGoTests(): Promise<boolean> {
    try {
      const files = await fs.readdir(this.cwd);
      return files.some(file => file.endsWith('_test.go'));
    } catch (e) {
      return false;
    }
  }

  async detectApiKeys(): Promise<DetectedApiKeys> {
    // Check environment variables first
    if (process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY) {
      return {
        openai: process.env.OPENAI_API_KEY,
        anthropic: process.env.ANTHROPIC_API_KEY,
        source: 'env'
      };
    }

    // Check .env files
    const envFiles = await this.findEnvFiles();
    for (const envFile of envFiles) {
      try {
        const content = await fs.readFile(path.join(this.cwd, envFile), 'utf-8');
        const openaiMatch = content.match(/OPENAI_API_KEY\s*=\s*(.+)/);
        const anthropicMatch = content.match(/ANTHROPIC_API_KEY\s*=\s*(.+)/);
        
        if (openaiMatch || anthropicMatch) {
          return {
            openai: openaiMatch?.[1]?.trim(),
            anthropic: anthropicMatch?.[1]?.trim(),
            source: 'dotenv',
            envFile
          };
        }
      } catch (e) {
        // Continue checking other files
      }
    }

    return { source: 'none' };
  }

  async checkGitHooks(): Promise<{ hasHooks: boolean; hookTypes: string[] }> {
    const hooksDir = path.join(this.cwd, '.git', 'hooks');
    
    try {
      const files = await fs.readdir(hooksDir);
      const hooks = files.filter(file => !file.endsWith('.sample'));
      
      return {
        hasHooks: hooks.length > 0,
        hookTypes: hooks
      };
    } catch (e) {
      return { hasHooks: false, hookTypes: [] };
    }
  }
}