const fs = require('fs');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

describe('CLI Tests', () => {
  test('package information defined', () => {
    expect(pkg.name).toBe('letsfixthis');
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(pkg.main).toBe('dist/cli.js');
    expect(pkg.bin.letsfixthis).toBe('./dist/cli.js');
  });

  test('required dependencies exist', () => {
    for (const dep of ['commander', 'express', 'ws', 'cors']) {
      expect(pkg.dependencies).toHaveProperty(dep);
    }
  });

  test('CLI exposes clear command', () => {
    const content = fs.readFileSync('src/cli.ts', 'utf-8');
    expect(content).toContain("command('clear')");
  });
});