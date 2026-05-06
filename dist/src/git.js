import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);
async function git(args, cwd) {
    const { stdout } = await execFileAsync('git', args, { cwd, timeout: 1000, maxBuffer: 1024 * 1024 });
    return stdout.toString().trim();
}
export async function getGitStatus(cwd) {
    try {
        const inside = await git(['rev-parse', '--is-inside-work-tree'], cwd);
        if (inside !== 'true')
            return null;
        const branch = await git(['branch', '--show-current'], cwd) || await git(['rev-parse', '--short', 'HEAD'], cwd);
        let ahead = 0;
        let behind = 0;
        try {
            const counts = await git(['rev-list', '--left-right', '--count', '@{upstream}...HEAD'], cwd);
            const [behindText, aheadText] = counts.split(/\s+/);
            behind = Number.parseInt(behindText ?? '0', 10) || 0;
            ahead = Number.parseInt(aheadText ?? '0', 10) || 0;
        }
        catch {
            ahead = 0;
            behind = 0;
        }
        const porcelain = await git(['status', '--porcelain=v1'], cwd);
        let added = 0;
        let modified = 0;
        let deleted = 0;
        let untracked = 0;
        for (const line of porcelain.split('\n').filter(Boolean)) {
            if (line.startsWith('??'))
                untracked += 1;
            if (line[0] === 'A' || line[1] === 'A')
                added += 1;
            if (line[0] === 'M' || line[1] === 'M')
                modified += 1;
            if (line[0] === 'D' || line[1] === 'D')
                deleted += 1;
        }
        return { branch, dirty: Boolean(porcelain), ahead, behind, added, modified, deleted, untracked };
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=git.js.map