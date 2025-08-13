import simpleGit from 'simple-git';
import { Logger } from '../utils/logger';

const logger = new Logger('ContextCollector');

export interface RepoContext {
  branch?: string;
  diff?: string;
  files?: string[];
}

export class ContextCollector {
  async collect(): Promise<RepoContext> {
    try {
      const git = simpleGit();
      const status = await git.status();
      const branch = status.current || undefined;
      const diff = await git.diff(['--cached']);
      const files = status.files.map((f) => f.path);
      return { branch, diff, files };
    } catch (err) {
      logger.warn('Git context unavailable; proceeding with minimal context');
      return {};
    }
  }
}


