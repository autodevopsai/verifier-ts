import { BaseAgent, AgentContext } from '../types/agent';
import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { Logger } from '../utils/logger';

const logger = new Logger('LintAgent');

export class LintAgent extends BaseAgent {
  id = 'lint';
  name = 'Polyglot Linter';
  description = 'Multi-language code linting';
  model: 'none' = 'none';
  max_tokens = 0;

  async execute(context: AgentContext) {
    if (!context.files || context.files.length === 0) return this.createResult({ status: 'skipped', error: 'No files to lint' });
    const issues: any[] = [];
    let totalIssues = 0;
    for (const file of context.files) {
      const extension = file.split('.').pop()?.toLowerCase();
      if (!extension) continue;
      try {
        let lintResult: string | null = null;
        switch (extension) {
          case 'ts':
          case 'tsx':
          case 'js':
          case 'jsx':
            lintResult = this.runESLint(file);
            break;
          case 'py':
            lintResult = this.runRuff(file);
            break;
          case 'go':
            lintResult = this.runGoFmt(file);
            break;
          case 'rs':
            lintResult = this.runRustFmt(file);
            break;
          case 'java':
            lintResult = this.runCheckstyle(file);
            break;
        }
        if (lintResult) {
          issues.push({ file, language: this.getLanguage(extension), issues: lintResult });
          totalIssues++;
        }
      } catch (error) {
        logger.debug(`Linting failed for ${file}`, error);
      }
    }
    const artifactsDir = path.join(process.cwd(), '.verifier', 'artifacts');
    await fs.ensureDir(artifactsDir);
    const reportPath = path.join(artifactsDir, 'lint-report.json');
    if (totalIssues > 0) await fs.writeFile(reportPath, JSON.stringify(issues, null, 2), 'utf-8');
    return this.createResult({ data: { total_issues: totalIssues, files_checked: context.files.length, issues }, severity: totalIssues > 10 ? 'warning' : 'info', artifacts: totalIssues > 0 ? [{ type: 'report', path: reportPath }] : undefined });
  }

  private runESLint(file: string): string | null {
    try {
      execSync(`npx eslint ${file} --format=json`, { stdio: 'pipe' });
      return null;
    } catch (error: any) {
      return error.stdout?.toString() || 'ESLint error';
    }
  }
  private runRuff(file: string): string | null {
    try {
      execSync(`ruff check ${file} --format=json`, { stdio: 'pipe' });
      return null;
    } catch (error: any) {
      return error.stdout?.toString() || 'Ruff error';
    }
  }
  private runGoFmt(file: string): string | null {
    try {
      const result = execSync(`gofmt -d ${file}`, { stdio: 'pipe' });
      return result.toString() || null;
    } catch {
      return 'gofmt not available';
    }
  }
  private runRustFmt(file: string): string | null {
    try {
      execSync(`rustfmt --check ${file}`, { stdio: 'pipe' });
      return null;
    } catch {
      return 'rustfmt check failed';
    }
  }
  private runCheckstyle(file: string): string | null {
    try {
      execSync(`checkstyle -c /google_checks.xml ${file}`, { stdio: 'pipe' });
      return null;
    } catch (error: any) {
      return error.stdout?.toString() || 'Checkstyle error';
    }
  }
  private getLanguage(extension: string): string {
    const map: Record<string, string> = { ts: 'TypeScript', tsx: 'TypeScript React', js: 'JavaScript', jsx: 'JavaScript React', py: 'Python', go: 'Go', rs: 'Rust', java: 'Java' };
    return map[extension] || extension.toUpperCase();
  }
}


