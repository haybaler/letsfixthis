import * as fs from 'fs';
import * as path from 'path';
import { FileSummary } from './codebase-analyzer';

export interface KnowledgeStats {
  filesIndexed: number;
  totalSize: number;
  modules: number;
}

export class KnowledgeStore {
  private dbPath: string;
  private data: Record<string, FileSummary> = {};
  private reviewsPath: string;
  private reviews: any[] = [];

  constructor(cacheDir: string = path.join(process.cwd(), '.letsfixthis-cache')) {
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
    this.dbPath = path.join(cacheDir, 'knowledge.json');
    this.reviewsPath = path.join(cacheDir, 'reviews.json');
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.dbPath)) {
        this.data = JSON.parse(fs.readFileSync(this.dbPath, 'utf8'));
      }
      if (fs.existsSync(this.reviewsPath)) {
        this.reviews = JSON.parse(fs.readFileSync(this.reviewsPath, 'utf8'));
      }
    } catch {
      this.data = {};
      this.reviews = [];
    }
  }

  private persist(): void {
    fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2));
    fs.writeFileSync(this.reviewsPath, JSON.stringify(this.reviews, null, 2));
  }

  upsert(summary: FileSummary): void {
    this.data[summary.filePath] = summary;
    this.persist();
  }

  upsertMany(summaries: FileSummary[]): void {
    for (const s of summaries) {
      this.data[s.filePath] = s;
    }
    this.persist();
  }

  get(filePath: string): FileSummary | undefined {
    return this.data[filePath];
  }

  getAll(): FileSummary[] {
    return Object.values(this.data);
  }

  getStats(): KnowledgeStats {
    const files = this.getAll();
    const totalSize = files.reduce((acc, f) => acc + (f.size || 0), 0);
    const modules = files.reduce((acc, f) => acc + (f.exports?.length || 0), 0);
    return { filesIndexed: files.length, totalSize, modules };
  }

  getDependencyGraph(): Record<string, string[]> {
    const graph: Record<string, string[]> = {};
    for (const f of Object.values(this.data)) {
      graph[f.filePath] = f.imports || [];
    }
    return graph;
  }

  addReview(review: any): void {
    this.reviews.unshift({ ts: Date.now(), ...review });
    this.persist();
  }

  getReviews(limit: number = 20): any[] {
    return this.reviews.slice(0, limit);
  }
}


