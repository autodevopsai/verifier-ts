import { Command } from 'commander';
import { exec } from 'child_process';
import { Logger } from '../utils/logger';

const logger = new Logger('worktree');

async function runGitCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        logger.error(`Error executing command: ${command}`);
        reject(new Error(stderr || error.message));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

async function addWorktree(path: string, branch?: string) {
  try {
    const command = `git worktree add ${path} ${branch || ''}`;
    logger.info(`Creating worktree at '${path}'...`);
    const output = await runGitCommand(command);
    logger.success('Worktree created successfully.');
    console.log(output);
  } catch (error) {
    if (error instanceof Error) {
        logger.error(`Failed to create worktree: ${error.message}`);
    } else {
        logger.error('An unknown error occurred while creating the worktree.');
    }
    process.exit(1);
  }
}

async function listWorktrees() {
  try {
    logger.info('Listing worktrees...');
    const output = await runGitCommand('git worktree list --porcelain');

    const worktrees = output.split('\n\n').filter(Boolean).map(block => {
      const lines = block.split('\n');
      const worktreeLine = lines.find(l => l.startsWith('worktree '));
      const branchLine = lines.find(l => l.startsWith('branch '));
      const headLine = lines.find(l => l.startsWith('HEAD '));
      return {
        path: worktreeLine?.split(' ')[1] || 'unknown',
        head: headLine?.split(' ')[1] || 'detached',
        branch: branchLine?.split(' ')[1] || 'detached',
      };
    });

    if (worktrees.length === 0) {
      logger.info("No worktrees found.");
      return;
    }

    console.table(worktrees.map(w => ({
        Path: w.path,
        'HEAD': w.head.substring(0, 7),
        Branch: w.branch.replace('refs/heads/', ''),
    })));

  } catch (error) {
    if (error instanceof Error) {
        logger.error(`Failed to list worktrees: ${error.message}`);
    } else {
        logger.error('An unknown error occurred while listing worktrees.');
    }
    process.exit(1);
  }
}

async function removeWorktree(path: string) {
  try {
    logger.info(`Removing worktree at '${path}'...`);
    const output = await runGitCommand(`git worktree remove ${path}`);
    logger.success(`Worktree at '${path}' removed successfully.`);
    console.log(output);
  } catch (error) {
    if (error instanceof Error) {
        logger.error(`Failed to remove worktree: ${error.message}`);
    } else {
        logger.error('An unknown error occurred while removing the worktree.');
    }
    process.exit(1);
  }
}

export const worktreeCommand = new Command('worktree')
  .description('Manage git worktrees for parallel development')
  .addCommand(
    new Command('add')
      .description('Create a new worktree')
      .argument('<path>', 'Path for the new worktree')
      .argument('[branch]', 'The branch to check out')
      .action(addWorktree)
  )
  .addCommand(
    new Command('list')
      .description('List all worktrees')
      .action(listWorktrees)
  )
  .addCommand(
    new Command('remove')
      .description('Remove a worktree')
      .argument('<path>', 'Path of the worktree to remove')
      .action(removeWorktree)
  );
