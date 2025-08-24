import { spawn } from 'child_process';
import { Config } from '../types/config';
import { Logger } from '../utils/logger';

const logger = new Logger('HookManager');
const DEFAULT_HOOK_TIMEOUT_MS = 10_000; // 10s
const CLAUDE_SYSTEM_REMINDER =
  '<system-reminder>Stay focused on the current goal and avoid drifting from the task.</system-reminder>';

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
      return {
        shouldBlock: false,
        ...(provider === 'claude' && { additionalContext: CLAUDE_SYSTEM_REMINDER }),
      };
    }

    logger.debug(`Executing hooks for event: ${eventName} (provider: ${provider})`);
    let shouldBlock = false;
    let additionalContext = provider === 'claude' ? `${CLAUDE_SYSTEM_REMINDER}\n` : '';

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
    const m = (matcher ?? '').trim();
    // If no matcher or wildcard, always applies (even when no toolName present, e.g., SessionStart)
    if (m === '' || m === '*') return true;
    // For tool-scoped matchers, require a tool name
    if (!toolName) return false;
    try {
      // Escape regex specials except '*', then convert '*' → '.*'
      const escaped = m.replace(/[.+?^${}()|\[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      const regex = new RegExp(`^${escaped}$`);
      return regex.test(toolName);
    } catch (error) {
      logger.error(`Invalid matcher pattern: ${m}`, error);
      return false;
    }
  }

  private runHookCommand(
    command: string,
    eventData: any,
    timeout?: number
  ): Promise<{ stdout: string; stderr: string; code: number | null }> {
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
      });

      let stdout = '';
      let stderr = '';
      let settled = false;
      let timedOut = false;

      const killTimer = setTimeout(() => {
        timedOut = true;
        try {
          child.kill('SIGKILL');
        } catch {}
      }, Math.max(1, timeout ?? DEFAULT_HOOK_TIMEOUT_MS));

      child.stdin.write(JSON.stringify(eventData));
      child.stdin.end();

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const finalize = (code: number | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(killTimer);
        if (timedOut) {
          logger.error(`Hook timed out after ${timeout ?? DEFAULT_HOOK_TIMEOUT_MS}ms: ${command}`);
          resolve({ stdout, stderr: (stderr ? stderr + '\n' : '') + 'Hook timed out', code: 124 });
          return;
        }
        if (code !== 0) {
          logger.error(`Hook command exited with code ${code}: ${command}`);
        }
        resolve({ stdout, stderr, code });
      };

      child.on('close', finalize);
      child.on('exit', finalize);
      child.on('error', (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(killTimer);
        logger.error(`Failed to start hook command: ${command}`, err);
        resolve({ stdout: '', stderr: err.message, code: -1 });
      });
    });
  }
}
