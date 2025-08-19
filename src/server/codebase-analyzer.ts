import * as fs from 'fs';
import * as path from 'path';
import chokidar from 'chokidar';

export interface AnalyzerOptions {
  rootDir: string;
  cacheDir?: string;
}

export interface FileSummary {
  filePath: string;
  size: number;
  hash: string;
  exports?: string[];
  imports?: string[];
}

export class CodebaseAnalyzer {
  private rootDir: string;
  private cacheDir: string;
  private watcher: chokidar.FSWatcher | null = null;

  constructor(options: AnalyzerOptions) {
    this.rootDir = options.rootDir;
    this.cacheDir = options.cacheDir || path.join(process.cwd(), '.letsfixthis-cache');
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  startWatching(onChange: (changed: string[]) => void): void {
    this.watcher = chokidar.watch(['**/*.{ts,tsx,js,jsx,json}'], {
      cwd: this.rootDir,
      ignored: ['node_modules', 'dist', '.git', '.letsfixthis-cache'],
      ignoreInitial: true,
    });
    this.watcher.on('all', (_event, file) => {
      onChange([path.join(this.rootDir, file)]);
    });
  }

  stopWatching(): void {
    this.watcher?.close();
    this.watcher = null;
  }

  summarizeFile(filePath: string): FileSummary | null {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const size = Buffer.byteLength(content);
      const hash = require('crypto').createHash('sha1').update(content).digest('hex');
      const imports = Array.from(content.matchAll(/import\s+[^'"\n]+from\s+['"]([^'"]+)['"]/g)).map(m => m[1]);
      const exports = Array.from(content.matchAll(/export\s+(?:const|function|class)\s+([\w$]+)/g)).map(m => m[1]);
      return { filePath, size, hash, imports, exports };
    } catch {
      return null;
    }
  }

  writeSummary(summary: FileSummary): void {
    const out = path.join(this.cacheDir, `${summary.filePath.replace(/[^\w.-]+/g, '_')}.json`);
    fs.writeFileSync(out, JSON.stringify(summary, null, 2));
  }

  summarizeChanged(files: string[]): FileSummary[] {
    const results: FileSummary[] = [];
    for (const f of files) {
      const s = this.summarizeFile(f);
      if (s) {
        results.push(s);
        this.writeSummary(s);
      }
    }
    return results;
  }
}


