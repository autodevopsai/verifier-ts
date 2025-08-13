import fs from 'fs-extra';
import path from 'path';
import { AgentResult } from '../types/agent';
import { Logger } from '../utils/logger';

const logger = new Logger('SessionStore');

export interface Session {
  id: string;
  timestamp: string;
  hook: string;
  context: any;
  results: AgentResult[];
  metadata: Record<string, any>;
}

export class SessionStore {
  private sessionsDir = path.join(process.cwd(), '.verifier', 'sessions');

  async save(session: Session): Promise<void> {
    try {
      const date = new Date(session.timestamp).toISOString().split('T')[0];
      const dir = path.join(this.sessionsDir, date);
      await fs.ensureDir(dir);
      const file = path.join(dir, `${session.hook}-${session.id}.json`);
      await fs.writeFile(file, JSON.stringify(session, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Failed to save session', err);
    }
  }

  async get(sessionId: string): Promise<Session | null> {
    try {
      const files = await this.findSessionFiles();
      for (const f of files) {
        const content = await fs.readFile(f, 'utf-8');
        const s = JSON.parse(content) as Session;
        if (s.id === sessionId) return s;
      }
      return null;
    } catch (err) {
      logger.error('Failed to get session', err);
      return null;
    }
  }

  async list(options: { since?: Date; hook?: string } = {}): Promise<Session[]> {
    try {
      const files = await this.findSessionFiles();
      const sessions: Session[] = [];
      for (const f of files) {
        const s = JSON.parse(await fs.readFile(f, 'utf-8')) as Session;
        if (options.since && new Date(s.timestamp) < options.since) continue;
        if (options.hook && s.hook !== options.hook) continue;
        sessions.push(s);
      }
      return sessions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (err) {
      logger.error('Failed to list sessions', err);
      return [];
    }
  }

  private async findSessionFiles(): Promise<string[]> {
    await fs.ensureDir(this.sessionsDir);
    const out: string[] = [];
    const dates = await fs.readdir(this.sessionsDir);
    for (const date of dates) {
      const dateDir = path.join(this.sessionsDir, date);
      const stat = await fs.stat(dateDir);
      if (stat.isDirectory()) {
        const files = await fs.readdir(dateDir);
        for (const f of files) {
          if (f.endsWith('.json')) out.push(path.join(dateDir, f));
        }
      }
    }
    return out;
  }
}


