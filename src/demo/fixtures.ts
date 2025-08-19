/**
 * Demo fixtures providing realistic mock responses for different analysis types.
 * These responses are designed to be impressive and show real value.
 */
export class DemoFixtures {
  private securityResponses = [
    {
      risk_score: 8,
      vulnerabilities: [
        {
          type: "SQL Injection",
          severity: "high",
          description: "Direct string concatenation in database query allows SQL injection attacks",
          location: "src/auth/login.ts:42",
          recommendation: "Use parameterized queries or prepared statements instead of string concatenation"
        },
        {
          type: "Cross-Site Scripting (XSS)",
          severity: "medium",
          description: "User input rendered without proper sanitization",
          location: "src/components/UserProfile.tsx:89",
          recommendation: "Sanitize user input using a trusted library like DOMPurify before rendering"
        },
        {
          type: "Information Disclosure",
          severity: "low",
          description: "Stack trace exposed in error response",
          location: "src/api/error-handler.ts:15",
          recommendation: "Log full errors server-side but return generic error messages to clients"
        }
      ],
      summary: "Found 3 security vulnerabilities including 1 high-risk SQL injection vulnerability. Immediate attention required for database query security."
    },
    {
      risk_score: 3,
      vulnerabilities: [
        {
          type: "Weak Cryptography",
          severity: "medium",
          description: "Using deprecated MD5 hash function for password hashing",
          location: "src/utils/crypto.ts:28",
          recommendation: "Migrate to bcrypt or Argon2 for secure password hashing"
        }
      ],
      summary: "Low risk profile with 1 medium-severity cryptography issue. Consider upgrading hashing algorithm."
    }
  ];

  private lintResponses = [
    {
      total_issues: 12,
      files_scanned: 8,
      issues_by_severity: {
        error: 2,
        warning: 7,
        info: 3
      },
      top_issues: [
        {
          rule: "no-unused-vars",
          count: 4,
          severity: "warning",
          description: "Variables declared but never used"
        },
        {
          rule: "prefer-const",
          count: 3,
          severity: "info",
          description: "Variables that are never reassigned should use const"
        },
        {
          rule: "no-console",
          count: 2,
          severity: "error",
          description: "Console statements should not be used in production"
        }
      ],
      summary: "Code quality is good overall. 2 errors need immediate attention, mostly related to console statements in production code."
    },
    {
      total_issues: 0,
      files_scanned: 5,
      issues_by_severity: {
        error: 0,
        warning: 0,
        info: 0
      },
      top_issues: [],
      summary: "Excellent code quality! No linting issues found across all scanned files."
    }
  ];

  private coverageResponses = [
    {
      overall_coverage: 87.3,
      line_coverage: 89.1,
      branch_coverage: 84.7,
      function_coverage: 91.2,
      uncovered_files: [
        {
          file: "src/utils/legacy-parser.ts",
          coverage: 34.2,
          missing_lines: [45, 67, 89, 102, 134]
        },
        {
          file: "src/api/webhook-handler.ts",
          coverage: 58.9,
          missing_lines: [23, 56, 78]
        }
      ],
      summary: "Good test coverage overall at 87.3%. Focus on legacy-parser.ts and webhook-handler.ts to reach 90% target."
    }
  ];

  private performanceResponses = [
    {
      performance_score: 78,
      metrics: {
        bundle_size: "2.4MB",
        load_time: "1.8s",
        first_contentful_paint: "1.2s",
        largest_contentful_paint: "2.1s"
      },
      optimizations: [
        {
          type: "Bundle Splitting",
          impact: "high",
          description: "Large vendor chunks detected",
          recommendation: "Implement dynamic imports for route-based code splitting"
        },
        {
          type: "Image Optimization",
          impact: "medium",
          description: "Unoptimized images found",
          recommendation: "Use WebP format and implement lazy loading"
        },
        {
          type: "Caching Strategy",
          impact: "medium",
          description: "Static assets lack proper cache headers",
          recommendation: "Configure long-term caching for static assets"
        }
      ],
      summary: "Performance is acceptable but has room for improvement. Bundle splitting would provide the biggest impact."
    }
  ];

  private genericResponses = [
    {
      analysis_type: "code_review",
      score: 85,
      findings: [
        {
          category: "Architecture",
          rating: "good",
          notes: "Well-structured component hierarchy with clear separation of concerns"
        },
        {
          category: "Documentation",
          rating: "needs_improvement",
          notes: "Function documentation is sparse, consider adding JSDoc comments"
        },
        {
          category: "Error Handling",
          rating: "excellent",
          notes: "Comprehensive error handling with proper logging and user feedback"
        }
      ],
      summary: "Solid codebase with good architecture and error handling. Documentation could be improved."
    }
  ];

  /**
   * Get a realistic response for the specified analysis type
   */
  getResponse(analysisType: 'security' | 'lint' | 'coverage' | 'performance' | 'generic', jsonMode = false): string {
    let response: any;

    switch (analysisType) {
      case 'security':
        response = this.getRandomItem(this.securityResponses);
        break;
      case 'lint':
        response = this.getRandomItem(this.lintResponses);
        break;
      case 'coverage':
        response = this.getRandomItem(this.coverageResponses);
        break;
      case 'performance':
        response = this.getRandomItem(this.performanceResponses);
        break;
      default:
        response = this.getRandomItem(this.genericResponses);
    }

    if (jsonMode) {
      return JSON.stringify(response, null, 2);
    }

    return this.formatAsText(response, analysisType);
  }

  /**
   * Get a random item from an array
   */
  private getRandomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Format response as human-readable text when not in JSON mode
   */
  private formatAsText(response: any, analysisType: string): string {
    switch (analysisType) {
      case 'security':
        return this.formatSecurityText(response);
      case 'lint':
        return this.formatLintText(response);
      case 'coverage':
        return this.formatCoverageText(response);
      case 'performance':
        return this.formatPerformanceText(response);
      default:
        return this.formatGenericText(response);
    }
  }

  private formatSecurityText(data: any): string {
    let text = `Security Analysis Results\n`;
    text += `Risk Score: ${data.risk_score}/10\n\n`;
    
    if (data.vulnerabilities.length > 0) {
      text += `Vulnerabilities Found:\n`;
      data.vulnerabilities.forEach((vuln: any, index: number) => {
        text += `${index + 1}. ${vuln.type} (${vuln.severity.toUpperCase()})\n`;
        text += `   Location: ${vuln.location}\n`;
        text += `   Description: ${vuln.description}\n`;
        text += `   Fix: ${vuln.recommendation}\n\n`;
      });
    }
    
    text += `Summary: ${data.summary}`;
    return text;
  }

  private formatLintText(data: any): string {
    let text = `Code Quality Analysis\n`;
    text += `Files Scanned: ${data.files_scanned}\n`;
    text += `Total Issues: ${data.total_issues}\n\n`;
    
    if (data.issues_by_severity) {
      text += `Issues by Severity:\n`;
      text += `  Errors: ${data.issues_by_severity.error}\n`;
      text += `  Warnings: ${data.issues_by_severity.warning}\n`;
      text += `  Info: ${data.issues_by_severity.info}\n\n`;
    }
    
    if (data.top_issues && data.top_issues.length > 0) {
      text += `Top Issues:\n`;
      data.top_issues.forEach((issue: any) => {
        text += `  • ${issue.rule}: ${issue.count} occurrences (${issue.severity})\n`;
        text += `    ${issue.description}\n`;
      });
    }
    
    text += `\nSummary: ${data.summary}`;
    return text;
  }

  private formatCoverageText(data: any): string {
    let text = `Test Coverage Report\n`;
    text += `Overall Coverage: ${data.overall_coverage}%\n`;
    text += `Line Coverage: ${data.line_coverage}%\n`;
    text += `Branch Coverage: ${data.branch_coverage}%\n`;
    text += `Function Coverage: ${data.function_coverage}%\n\n`;
    
    if (data.uncovered_files && data.uncovered_files.length > 0) {
      text += `Files Needing Attention:\n`;
      data.uncovered_files.forEach((file: any) => {
        text += `  • ${file.file}: ${file.coverage}% coverage\n`;
      });
    }
    
    text += `\nSummary: ${data.summary}`;
    return text;
  }

  private formatPerformanceText(data: any): string {
    let text = `Performance Analysis\n`;
    text += `Performance Score: ${data.performance_score}/100\n\n`;
    text += `Key Metrics:\n`;
    text += `  Bundle Size: ${data.metrics.bundle_size}\n`;
    text += `  Load Time: ${data.metrics.load_time}\n`;
    text += `  First Contentful Paint: ${data.metrics.first_contentful_paint}\n`;
    text += `  Largest Contentful Paint: ${data.metrics.largest_contentful_paint}\n\n`;
    
    if (data.optimizations && data.optimizations.length > 0) {
      text += `Optimization Opportunities:\n`;
      data.optimizations.forEach((opt: any) => {
        text += `  • ${opt.type} (${opt.impact} impact)\n`;
        text += `    ${opt.description}\n`;
        text += `    Recommendation: ${opt.recommendation}\n\n`;
      });
    }
    
    text += `Summary: ${data.summary}`;
    return text;
  }

  private formatGenericText(data: any): string {
    let text = `Code Analysis Results\n`;
    text += `Overall Score: ${data.score}/100\n\n`;
    
    if (data.findings && data.findings.length > 0) {
      text += `Findings:\n`;
      data.findings.forEach((finding: any) => {
        text += `  • ${finding.category}: ${finding.rating.replace('_', ' ').toUpperCase()}\n`;
        text += `    ${finding.notes}\n\n`;
      });
    }
    
    text += `Summary: ${data.summary}`;
    return text;
  }
}