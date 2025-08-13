import path from 'path';

export function getHomeDir(): string {
  const dir = process.env.VERIFIER_HOME || '.verifier';
  return path.join(process.cwd(), dir);
}


