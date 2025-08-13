import fs from 'fs-extra';
import path from 'path';
import { Logger } from '../utils/logger';

const logger = new Logger('MetricsStore');

export interface Metric {
  agent_id: string;
  timestamp: string; // ISO string
  tokens_used: number;
  cost: number;
  result: string;
  duration_ms: number;
}

export class MetricsStore {
  private metricsDir = path.join(process.cwd(), '.verifier', 'metrics');

  async record(metric: Metric): Promise<void> {
    try {
      await fs.ensureDir(this.metricsDir);
      const date = new Date(metric.timestamp).toISOString().split('T')[0];
      const file = path.join(this.metricsDir, `${date}.json`);
      let metrics: Metric[] = [];
      if (await fs.pathExists(file)) {
        metrics = JSON.parse(await fs.readFile(file, 'utf-8')) as Metric[];
      }
      metrics.push(metric);
      await fs.writeFile(file, JSON.stringify(metrics, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Failed to record metric', err);
    }
  }

  async getMetrics(period: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<Metric[]> {
    try {
      await fs.ensureDir(this.metricsDir);
      const now = new Date();
      let start: Date;
      switch (period) {
        case 'hourly':
          start = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case 'daily':
          start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'weekly':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      const files = await fs.readdir(this.metricsDir);
      const out: Metric[] = [];
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const dateStr = file.replace('.json', '');
        const fileDate = new Date(dateStr);
        if (fileDate >= start) {
          const content = await fs.readFile(path.join(this.metricsDir, file), 'utf-8');
          const data: Metric[] = JSON.parse(content);
          out.push(...data.filter((m) => new Date(m.timestamp) >= start));
        }
      }
      return out;
    } catch (err) {
      logger.error('Failed to get metrics', err);
      return [];
    }
  }
}


