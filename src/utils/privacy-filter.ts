import { Logger } from './logger';

const logger = new Logger('PrivacyFilter');

export class PrivacyFilter {
  private patterns = {
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    apiKey: /\b(sk|api|key|token|secret|password)[-_]?[a-zA-Z0-9]{20,}\b/gi,
    awsKey: /\b(AKIA[0-9A-Z]{16})\b/g,
    githubToken: /\b(ghp_[a-zA-Z0-9]{36})\b/g,
    privateKey: /-----BEGIN (RSA |EC )?PRIVATE KEY-----[\s\S]*?-----END (RSA |EC )?PRIVATE KEY-----/g,
  } as const;

  async filter(text: string): Promise<string> {
    let filtered = text;
    let redactionCount = 0;
    for (const [type, pattern] of Object.entries(this.patterns)) {
      const matches = filtered.match(pattern);
      if (matches) {
        redactionCount += matches.length;
        filtered = filtered.replace(pattern, `[REDACTED_${type.toUpperCase()}]`);
      }
    }
    if (redactionCount > 0) logger.debug(`Redacted ${redactionCount} sensitive patterns`);
    return filtered;
  }

  async filterObject<T = any>(obj: T): Promise<T> {
    if (typeof obj === 'string') return (await this.filter(obj)) as any;
    if (Array.isArray(obj)) return (await Promise.all(obj.map((i) => this.filterObject(i)))) as any;
    if (obj && typeof obj === 'object') {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(obj as any)) {
        if (this.isSensitiveKey(k)) out[k] = '[REDACTED]';
        else out[k] = await this.filterObject(v);
      }
      return out as T;
    }
    return obj;
  }

  private isSensitiveKey(key: string): boolean {
    const sensitiveKeys = [
      'password',
      'secret',
      'token',
      'api_key',
      'apiKey',
      'private_key',
      'privateKey',
      'access_token',
      'accessToken',
      'refresh_token',
      'refreshToken',
      'client_secret',
      'clientSecret',
    ];
    return sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()));
  }
}


