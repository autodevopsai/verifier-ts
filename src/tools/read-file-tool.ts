import { Tool, ToolInput, ToolResult } from '../types/tool';
import fs from 'fs-extra';

export class ReadFileTool implements Tool {
  name = 'Read';
  description = 'Reads the content of a file.';

  async execute(input: ToolInput): Promise<ToolResult> {
    const { file_path } = input;
    if (!file_path) {
      return { success: false, error: 'Missing file_path' };
    }

    try {
      const content = await fs.readFile(file_path, 'utf-8');
      return { success: true, data: { content } };
    } catch (error: any) {
      return { success: false, error: `Error reading file: ${error.message}` };
    }
  }
}
