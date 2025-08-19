import chalk from 'chalk';
import { runCommand } from './run';

/**
 * Interactive demo command that showcases the verifier's capabilities
 */
export async function demoCommand(options: { agent?: string } = {}): Promise<void> {
  console.log(chalk.bold.blue('\n🎬 Welcome to AutoDevOps Verifier Demo!'));
  console.log(chalk.white('This demo shows you what our AI-powered code verification can do.\n'));
  
  // Allow running specific agents in demo mode
  const agentToRun = options.agent || 'security-scan';
  
  console.log(chalk.yellow(`🔍 Running ${agentToRun} analysis on sample code...`));
  console.log(chalk.gray('(This normally requires an API key, but the demo runs locally)\n'));
  
  // Run the specified agent in demo mode
  await runCommand(agentToRun, { demo: true });
  
  console.log(chalk.gray('\n' + '='.repeat(60)));
  console.log(chalk.bold.green('\n🎉 Demo Complete!'));
  console.log(chalk.white('\nWhat you just saw:'));
  console.log(chalk.blue('  ✅ AI-powered security vulnerability detection'));
  console.log(chalk.blue('  ✅ Detailed risk scoring and recommendations'));  
  console.log(chalk.blue('  ✅ Production-ready output formatting'));
  console.log(chalk.blue('  ✅ Zero setup required for demo'));
  
  console.log(chalk.white('\nThe real version also includes:'));
  console.log(chalk.green('  🚀 Code quality and lint analysis'));
  console.log(chalk.green('  🚀 Performance optimization detection'));
  console.log(chalk.green('  🚀 Test coverage analysis'));
  console.log(chalk.green('  🚀 Git hook integration'));
  console.log(chalk.green('  🚀 CI/CD pipeline integration'));
  console.log(chalk.green('  🚀 Custom agent development'));
  
  console.log(chalk.bold.cyan('\n📚 Learn more at: https://autodevops.ai'));
  console.log(chalk.bold.yellow('⭐ Star us on GitHub: https://github.com/sprotolabs/autodevops'));
}