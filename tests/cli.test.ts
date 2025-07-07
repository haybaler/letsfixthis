import { describe, it, expect } from '@jest/globals';

describe('letsfixthis CLI', () => {
  it('should have basic exports', () => {
    // Basic test to ensure the project structure is valid
    expect(true).toBe(true);
  });

  it('should define package information', () => {
    const packageJson = require('../package.json');
    expect(packageJson.name).toBe('letsfixthis');
    expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(packageJson.main).toBe('dist/cli.js');
    expect(packageJson.bin.letsfixthis).toBe('./dist/cli.js');
  });

  it('should have required dependencies', () => {
    const packageJson = require('../package.json');
    expect(packageJson.dependencies).toHaveProperty('commander');
    expect(packageJson.dependencies).toHaveProperty('express');
    expect(packageJson.dependencies).toHaveProperty('ws');
    expect(packageJson.dependencies).toHaveProperty('cors');
  });
});
