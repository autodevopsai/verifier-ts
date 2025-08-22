import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs-extra';

const sessionsDir = path.join(process.cwd(), '.verifier', 'sessions');

export class SessionManager {
  public sessionId: string;
  public transcriptPath: string;

  constructor() {
    this.sessionId = randomUUID();
    this.transcriptPath = path.join(sessionsDir, `${this.sessionId}.jsonl`);
    fs.ensureDirSync(sessionsDir);
  }

  public log(data: any): void {
    fs.appendFileSync(this.transcriptPath, JSON.stringify(data) + '\n');
  }
}
