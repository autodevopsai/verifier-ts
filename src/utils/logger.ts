import fs from 'fs-extra';
import path from 'path';
import winston from 'winston';

const logsDir = path.join(process.cwd(), '.verifier', 'logs');

function ensureLogsDir(): void {
  try {
    fs.ensureDirSync(logsDir);
  } catch {
    // ignore
  }
}

export class Logger {
  private logger: winston.Logger;

  constructor(scope: string) {
    ensureLogsDir();
    this.logger = winston.createLogger({
      level: process.env.VERIFIER_LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.printf((info) => {
          const { timestamp, level, message, stack, ...meta } = info as any;
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          const base = `${timestamp} [${scope}] ${level}: ${message}`;
          return stack ? `${base}\n${stack}${metaStr}` : `${base}${metaStr}`;
        })
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
        }),
        new winston.transports.File({ filename: path.join(logsDir, 'verifier.log') }),
      ],
    });
  }

  info(message: string, meta?: unknown): void {
    this.logger.info(message, meta);
  }
  warn(message: string, meta?: unknown): void {
    this.logger.warn(message, meta);
  }
  error(message: string, error?: unknown): void {
    if (error instanceof Error) this.logger.error(message, { stack: error.stack, name: error.name, message: error.message });
    else if (typeof error === 'string') this.logger.error(`${message} - ${error}`);
    else if (error) this.logger.error(message, error as any);
    else this.logger.error(message);
  }
  debug(message: string, meta?: unknown): void {
    this.logger.debug(message, meta);
  }
}


