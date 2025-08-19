import * as cp from 'child_process';

export interface PRDiffResult {
  patch: string;
}

export class GithubScanner {
  static getLocalDiff(baseRef: string = 'origin/main'): PRDiffResult {
    try {
      const patch = cp.execSync(`git fetch origin ${baseRef} --depth=1 >/dev/null 2>&1 || true; git diff ${baseRef}...HEAD`, { encoding: 'utf8' });
      return { patch };
    } catch (e) {
      return { patch: '' };
    }
  }
}


