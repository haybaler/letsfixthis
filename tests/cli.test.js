const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

test('package information defined', () => {
  assert.equal(pkg.name, 'letsfixthis');
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
  assert.equal(pkg.main, 'dist/cli.js');
  assert.equal(pkg.bin.letsfixthis, './dist/cli.js');
});

test('required dependencies exist', () => {
  for (const dep of ['commander', 'express', 'ws', 'cors']) {
    assert.ok(pkg.dependencies && pkg.dependencies[dep], `missing dependency ${dep}`);
  }
});

test('CLI exposes clear command', () => {
  const content = fs.readFileSync('src/cli.ts', 'utf-8');
  assert.ok(content.includes("command('clear')"));
});
