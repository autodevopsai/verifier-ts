import chalk from 'chalk';
import { AgentRunner } from '../core/agent-runner';
import { ContextCollector } from '../core/context-collector';
import { ConfigLoader } from '../core/config-loader';
import { AgentLoader } from '../core/agent-loader';
import { Logger } from '../utils/logger';
import { VerifierError, createError } from '../errors/error-handler';

const logger = new Logger('run');

export async function runCommand(
  agentId: string, 
  options: { files?: string[]; demo?: boolean } = {}
): Promise<void> {
  try {
    logger.progress(`Loading agent: ${agentId}`);

    // Load configuration
    let config;
    try {
      config = await ConfigLoader.load(options.demo);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw createError.configNotFound();
      }
      throw new VerifierError({
        code: 'CONFIG_INVALID',
        message: 'Failed to load configuration',
        cause: error as Error,
        context: { step: 'config_loading' }
      });
    }

    // Load available agents
    let agents;
    try {
      agents = await AgentLoader.loadAgents();
    } catch (error) {
      throw new VerifierError({
        code: 'AGENT_LOAD_FAILED',
        message: 'Failed to load agents',
        cause: error as Error,
        context: { step: 'agent_loading' }
      });
    }

    // Check if agent exists
    if (!agents.has(agentId)) {
      throw createError.agentNotFound(agentId, Array.from(agents.keys()));
    }

    // Demo mode setup
    let repoContext;
    if (options.demo) {
      logger.info('🎬 Running in demo mode - no API keys required!');
      repoContext = {
        repoPath: process.cwd(),
        branch: 'main',
        diff: `diff --git a/src/auth/login.ts b/src/auth/login.ts
index 1234567..abcdefg 100644
--- a/src/auth/login.ts
+++ b/src/auth/login.ts
@@ -40,7 +40,7 @@ export async function authenticateUser(username: string, password: string) {
   try {
-    const query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'";
+    const query = \`SELECT * FROM users WHERE username = '\${username}' AND password = '\${password}'\`;
     const result = await db.query(query);
     return result.rows[0];
   } catch (error) {`
      };
    } else {
      // Collect repository context
      logger.progress('Collecting repository context...');
      try {
        const contextCollector = new ContextCollector();
        repoContext = await contextCollector.collect();
      } catch (error) {
        if (error instanceof Error && error.message.includes('not a git repository')) {
          throw createError.notGitRepo();
        }
        throw new VerifierError({
          code: 'UNKNOWN_ERROR',
          message: 'Failed to collect repository context',
          cause: error as Error,
          context: { step: 'context_collection' }
        });
      }
    }

    // Prepare execution context
    const context = { ...repoContext, demoMode: options.demo } as any;
    if (options.files) {
      context.files = options.files;
      logger.debug(`Targeting specific files: ${options.files.join(', ')}`);
    }

    // Add progress indicator for demo mode
    if (options.demo) {
      logger.progress('Analyzing code...');
    }

    // Run the agent
    logger.progress(`Running ${agentId} agent...`);
    const runner = new AgentRunner(config, agents);
    
    let result;
    try {
      result = await runner.runAgent(agentId, context);
    } catch (error) {
      if (error instanceof Error) {
        // Check for specific error patterns
        if (error.message.includes('API key')) {
          const provider = config.providers?.openai ? 'openai' : 'anthropic';
          throw createError.missingApiKey(provider);
        }
        
        if (error.message.includes('rate limit')) {
          throw new VerifierError({
            code: 'RATE_LIMITED',
            cause: error,
            context: { agent: agentId }
          });
        }
        
        if (error.message.includes('network') || error.message.includes('timeout')) {
          throw createError.networkError(error.message);
        }
      }
      
      throw new VerifierError({
        code: 'UNKNOWN_ERROR',
        message: `Agent execution failed: ${agentId}`,
        cause: error as Error,
        context: { agent: agentId, step: 'agent_execution' }
      });
    }

    // Handle result
    if (result.status === 'failure') {
      logger.error(`Agent ${agentId} failed`, result.error, { 
        agent: agentId
      });
      
      throw new VerifierError({
        code: 'UNKNOWN_ERROR',
        message: `Agent '${agentId}' failed: ${result.error}`,
        context: { 
          agent: agentId, 
          error: result.error
        }
      });
    }

    // Enhanced output for demo mode
    if (options.demo) {
      console.log(chalk.green(`\n🎯 ${agentId} analysis completed!`));
      console.log(chalk.gray('─'.repeat(50)));
      
      if (result.severity) {
        const severityColor = result.severity === 'blocking' ? 'red' : result.severity === 'warning' ? 'yellow' : 'green';
        console.log(`Severity: ${chalk[severityColor](result.severity.toUpperCase())}`);
      }
      
      if (result.score != null) {
        const scoreColor = result.score >= 7 ? 'red' : result.score >= 4 ? 'yellow' : 'green';
        console.log(`Risk Score: ${chalk[scoreColor](result.score)}/10`);
      }
      
      if (result.tokens_used) {
        console.log(`Tokens Used: ${chalk.blue(result.tokens_used.toLocaleString())}`);
      }
      
      if (result.cost) {
        console.log(`Estimated Cost: ${chalk.green('$' + result.cost.toFixed(4))}`);
      }
      
      if (result.data) {
        console.log('\n📊 Detailed Results:');
        console.log(chalk.gray('─'.repeat(30)));
        
        // Pretty print the data based on agent type
        if (agentId === 'security-scan' && result.data.vulnerabilities) {
          result.data.vulnerabilities.forEach((vuln: any, index: number) => {
            const severityColor = vuln.severity === 'critical' || vuln.severity === 'high' ? 'red' : 
                                 vuln.severity === 'medium' ? 'yellow' : 'blue';
            console.log(`\n${index + 1}. ${chalk.bold(vuln.type)} ${chalk[severityColor](`[${vuln.severity.toUpperCase()}]`)}`);
            console.log(`   📍 ${chalk.gray(vuln.location)}`);
            console.log(`   💡 ${vuln.description}`);
            console.log(`   🔧 ${chalk.cyan(vuln.recommendation)}`);
          });
          console.log(`\n📝 ${chalk.italic(result.data.summary)}`);
        } else {
          console.log(JSON.stringify(result.data, null, 2));
        }
      }
      
      // Demo mode call-to-action
      console.log(chalk.gray('\n─'.repeat(50)));
      console.log(chalk.bold.green('\n🚀 Ready to use AutoDevOps Verifier for real?'));
      console.log(chalk.white('Get started in 2 minutes:'));
      console.log(chalk.blue('  1. npx @autodevops/verifier init'));
      console.log(chalk.blue('  2. Add your API key to .verifier/.env'));
      console.log(chalk.blue('  3. Run: verifier run security-scan'));
      console.log(chalk.yellow('\n✨ Visit autodevops.ai for full documentation'));
    } else {
      // Standard success output
      logger.success(`${agentId} completed successfully`);
      
      // Display results
      if (result.severity) {
        const severityEmoji = getSeverityEmoji(result.severity);
        logger.info(`${severityEmoji} Severity: ${result.severity}`);
      }
      
      if (result.score != null) {
        const scoreEmoji = getScoreEmoji(result.score);
        logger.info(`${scoreEmoji} Score: ${result.score}`);
      }
      
      if (result.tokens_used) {
        logger.debug(`Tokens used: ${result.tokens_used}`);
      }
      
      if (result.cost) {
        logger.debug(`Cost: $${result.cost.toFixed(4)}`);
      }
      
      if (result.data) {
        logger.info('📊 Results:');
        console.log(JSON.stringify(result.data, null, 2));
      }
    }

  } catch (error) {
    if (error instanceof VerifierError) {
      throw error;
    }
    
    // Wrap unexpected errors
    throw new VerifierError({
      code: 'UNKNOWN_ERROR',
      message: `Unexpected error in run command`,
      cause: error as Error,
      context: { command: 'run', agent: agentId, options }
    });
  }
}

/**
 * Get emoji for severity level
 */
function getSeverityEmoji(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'critical':
    case 'blocking':
      return '🚨';
    case 'high':
      return '🔴';
    case 'medium':
    case 'warning':
      return '🟡';
    case 'low':
      return '🟢';
    default:
      return '📊';
  }
}

/**
 * Get emoji for score
 */
function getScoreEmoji(score: number): string {
  if (score >= 90) return '🌟';
  if (score >= 75) return '✅';
  if (score >= 60) return '⚠️';
  return '❌';
}