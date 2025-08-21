import { BaseAgent, AgentContext } from '../types/agent';
import { ProviderFactory } from '../providers/provider-factory';
import { ConfigLoader } from '../core/config-loader';
import { ReadFileTool } from '../tools/read-file-tool';

export class ClaudeAgent extends BaseAgent {
  id = 'claude-agent';
  name = 'Claude Agent';
  description = 'An agent that uses a Claude model.';
  model = 'claude-3-opus-20240229';
  max_tokens = 2500;
  tools = [new ReadFileTool()];

  async execute(context: AgentContext) {
    if (!context.diff && !context.files && !context.demoMode) return this.createResult({ status: 'skipped', error: 'No diff or files available' });

    let fileContent = '';
    if (context.toolRunner && context.files && context.files.length > 0) {
      const filePath = context.files[0];
      const readResult = await context.toolRunner.runTool('Read', { file_path: filePath });
      if (readResult.success) {
        fileContent = readResult.data.content;
      }
    }

    const config = await ConfigLoader.load(context.demoMode);
    const provider = await ProviderFactory.create(this.model, config, context.demoMode);
    const prompt = `This is a test prompt for the Claude agent. The content of the file is: ${fileContent || context.diff}`;

    try {
      const response = await provider.complete(prompt);
      return this.createResult({ data: { response } });
    } catch (error: any) {
      return this.createResult({ status: 'failure', error: error?.message ?? 'Claude agent failed' });
    }
  }
}
