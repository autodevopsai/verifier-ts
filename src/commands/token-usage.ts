import chalk from 'chalk';
import Table from 'cli-table3';
import { MetricsStore } from '../storage/metrics-store';
import { ConfigLoader } from '../core/config-loader';

export async function tokenUsageCommand(options: { period?: 'hourly' | 'daily' | 'weekly' | 'monthly'; format?: 'table' | 'json' } = {}): Promise<void> {
  const metricsStore = new MetricsStore();
  const period = options.period || 'daily';
  const format = options.format || 'table';
  const config = await ConfigLoader.load();
  const metrics = await metricsStore.getMetrics(period);
  const usage = new Map<string, { tokens: number; cost: number; calls: number }>();
  let totalTokens = 0;
  let totalCost = 0;
  metrics.forEach((m) => {
    const current = usage.get(m.agent_id) || { tokens: 0, cost: 0, calls: 0 };
    current.tokens += m.tokens_used;
    current.cost += m.cost;
    current.calls += 1;
    usage.set(m.agent_id, current);
    totalTokens += m.tokens_used;
    totalCost += m.cost;
  });
  if (format === 'json') {
    const out = { period, total_tokens: totalTokens, total_cost: totalCost, by_agent: Object.fromEntries(usage) };
    console.log(JSON.stringify(out, null, 2));
    return;
  }
  console.log(chalk.cyan(`\nToken Usage Report (${period})`));
  const table = new Table({ head: ['Agent', 'Calls', 'Tokens', 'Cost'], style: { head: ['cyan'] } });
  usage.forEach((data, agent) => table.push([agent, `${data.calls}`, data.tokens.toLocaleString(), `$${data.cost.toFixed(2)}`]));
  console.log(table.toString());
  console.log('Total Tokens:', totalTokens.toLocaleString());
  console.log('Total Cost:', `$${totalCost.toFixed(2)}`);

  let budgetTokens: number | undefined;
  switch (period) {
    case 'hourly':
      budgetTokens = config.budgets.daily_tokens / 24;
      break;
    case 'daily':
      budgetTokens = config.budgets.daily_tokens;
      break;
    case 'weekly':
      budgetTokens = config.budgets.daily_tokens * 7;
      break;
    case 'monthly':
      // No monthly token budget, only cost. Could estimate, but better to be explicit.
      break;
  }

  if (budgetTokens) {
    const budgetUsed = budgetTokens > 0 ? (totalTokens / budgetTokens) * 100 : 0;
    const color = budgetUsed > 90 ? chalk.red : budgetUsed > 70 ? chalk.yellow : chalk.green;
    console.log('Budget Used:', color(`${budgetUsed.toFixed(1)}% of ${budgetTokens.toLocaleString()}`));
  }
}


