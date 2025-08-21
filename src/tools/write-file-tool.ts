import { Tool, ToolInput, ToolResult } from '../types/tool';
import fs from 'fs-extra';

export class WriteFileTool implements Tool {
  name = 'Write';
  description = 'Writes content to a file.';

  async execute(input: ToolInput): Promise<ToolResult> {
    const { file_path, content } = input;
    if (!file_path) {
      return { success: false, error: 'Missing file_path' };
    }
    if (content === undefined) {
      return { success: false, error: 'Missing content' };
    }

    try {
      await fs.writeFile(file_path, content, 'utf-8');
      return { success: true, data: { filePath: file_path } };
    } catch (error: any) {
      return { success: false, error: `Error writing file: ${error.message}` };
    }
  }
}
