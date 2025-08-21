import { spawn } from 'child_process';
import { Config } from '../types/config';
import { Logger } from '../utils/logger';

const logger = new Logger('HookManager');

export class HookManager {
  constructor(private config: Config) {}

  public async executeHooks(
    eventName: string,
    provider: 'generic' | 'claude' | 'gemini' | 'openai' | string,
    eventData: any
  ): Promise<{ shouldBlock: boolean; additionalContext?: string }> {
    const genericHooks = this.config.hooks?.generic?.[eventName as keyof typeof this.config.hooks.generic];
    const providerHooks = this.config.hooks?.[provider as keyof typeof this.config.hooks]?.[
      eventName as keyof (typeof this.config.hooks)['claude']
    ];

    const allHooks = [...(genericHooks || []), ...(providerHooks || [])];

    if (allHooks.length === 0) {
      return { shouldBlock: false };
    }

    logger.debug(`Executing hooks for event: ${eventName} (provider: ${provider})`);
    let shouldBlock = false;
    let additionalContext = '';

    for (const hookConfig of allHooks) {
      if (this.matcherApplies(hookConfig.matcher, eventData.tool_name)) {
        for (const hook of hookConfig.hooks) {
          const result = await this.runHookCommand(hook.command, eventData, hook.timeout);

          if (result.stdout) {
            try {
              const jsonOutput = JSON.parse(result.stdout);
              if (jsonOutput.continue === false) {
                logger.info(`Hook stopped execution: ${jsonOutput.stopReason || ''}`);
                shouldBlock = true;
              }
              if (jsonOutput.decision === 'block') {
                logger.info(`Hook blocked execution: ${jsonOutput.reason || ''}`);
                shouldBlock = true;
              }
              if (jsonOutput.hookSpecificOutput?.additionalContext) {
                additionalContext += jsonOutput.hookSpecificOutput.additionalContext;
              }
            } catch (error) {
              // Not a JSON output, treat as plain text
              logger.info(`[Hook STDOUT] ${result.stdout.trim()}`);
              if (eventName === 'UserPromptSubmit' || eventName === 'SessionStart') {
                additionalContext += result.stdout;
              }
            }
          }

          if (result.stderr) {
            logger.error(`[Hook STDERR] ${result.stderr.trim()}`);
          }

          if (result.code === 2) {
            shouldBlock = true;
          }
        }
      }
    }
    return { shouldBlock, additionalContext };
  }

  private matcherApplies(matcher: string | undefined, toolName: string | undefined): boolean {
    if (!matcher || matcher === '*' || matcher === '') {
      return true;
    }
    if (!toolName) {
      return false;
    }

    try {
      const regex = new RegExp(`^${matcher.replace(/\*/g, '.*')}$`);
      return regex.test(toolName);
    } catch (error) {
      logger.error(`Invalid matcher regex: ${matcher}`, error);
      return false;
    }
  }

  private runHookCommand(command: string, eventData: any, timeout?: number): Promise<{ stdout: string; stderr: string; code: number | null }> {
    return new Promise((resolve) => {
      logger.debug(`Executing hook command: ${command}`);
      const projectDir = process.cwd();
      const child = spawn(command, [], {
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          CLAUDE_PROJECT_DIR: projectDir,
        },
        timeout,
      });

      let stdout = '';
      let stderr = '';

      child.stdin.write(JSON.stringify(eventData));
      child.stdin.end();

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          logger.error(`Hook command exited with code ${code}: ${command}`);
        }
        resolve({ stdout, stderr, code });
      });

      child.on('error', (err) => {
        logger.error(`Failed to start hook command: ${command}`, err);
        resolve({ stdout: '', stderr: err.message, code: -1 });
      });
    });
  }
}
