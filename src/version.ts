import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function getCodexVersion(): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync('codex', ['--version'], { timeout: 1000 });
    return stdout.toString().trim().replace(/^codex-cli\s+/, '');
  } catch {
    return undefined;
  }
}
