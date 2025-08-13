import fs from 'fs/promises';
import path from 'path';
import { BaseAgent } from '../types/agent';
import { Logger } from '../utils/logger';

const logger = new Logger('AgentLoader');

type AgentClass = new () => BaseAgent;

export class AgentLoader {
  static async loadAgents(): Promise<Map<string, AgentClass>> {
    const agents = new Map<string, AgentClass>();
    const agentsDir = path.join(__dirname, '../agents');
    try {
      const files = await fs.readdir(agentsDir);
      for (const file of files) {
        if (file.endsWith('-agent.ts') || file.endsWith('-agent.js')) {
          const agentPath = path.join(agentsDir, file);
          try {
            const module = await import(agentPath);
            for (const key in module) {
              const exported = module[key];
              if (typeof exported === 'function' && exported.prototype instanceof BaseAgent) {
                const agent = new exported();
                if (agent.id) {
                  agents.set(agent.id, exported);
                  logger.debug(`Loaded agent: ${agent.id}`);
                }
              }
            }
          } catch (error) {
            logger.error(`Failed to load agent from ${file}`, error);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to read agents directory', error);
    }
    return agents;
  }
}
