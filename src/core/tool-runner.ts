import { Tool, ToolInput, ToolResult } from '../types/tool';
import { HookManager } from './hook-manager';
import { SessionManager } from './session-manager';

export class ToolRunner {
  private tools: Map<string, Tool> = new Map();

  constructor(
    tools: Tool[],
    private hookManager: HookManager,
    private session: SessionManager,
    private provider: string
  ) {
    for (const tool of tools) {
      this.tools.set(tool.name, tool);
    }
  }

  async runTool(toolName: string, input: ToolInput): Promise<ToolResult> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return { success: false, error: `Tool ${toolName} not found` };
    }

    this.session.log({ type: 'tool_start', tool: toolName, input });
    const preToolResult = await this.hookManager.executeHooks(
      'PreToolUse',
      this.provider,
      {
        session_id: this.session.sessionId,
        transcript_path: this.session.transcriptPath,
        cwd: process.cwd(),
        hook_event_name: 'PreToolUse',
        tool_name: toolName,
        tool_input: input,
      }
    );

    if (preToolResult.shouldBlock) {
      return { success: false, error: 'Tool execution blocked by PreToolUse hook' };
    }

    try {
      const result = await tool.execute(input);
      this.session.log({ type: 'tool_end', tool: toolName, result });
      await this.hookManager.executeHooks(
        'PostToolUse',
        this.provider,
        {
          session_id: this.session.sessionId,
          transcript_path: this.session.transcriptPath,
          cwd: process.cwd(),
          hook_event_name: 'PostToolUse',
          tool_name: toolName,
          tool_input: input,
          tool_response: result,
        }
      );
      return result;
    } catch (error: any) {
      const errorResult = { success: false, error: `Error executing tool ${toolName}: ${error.message}` };
      this.session.log({ type: 'tool_error', tool: toolName, error: errorResult });
      return errorResult;
    }
  }
}
