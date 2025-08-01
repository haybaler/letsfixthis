const { generateSuggestions } = require('../src/suggestions');

describe('Suggestion Generation', () => {
  test('should return no suggestions for no logs', () => {
    const suggestions = generateSuggestions([]);
    expect(suggestions).toEqual([]);
  });

  test('should suggest focusing on errors', () => {
    const logs = [{ level: 'error', message: 'Test error' }];
    const suggestions = generateSuggestions(logs);
    expect(suggestions).toContain('Focus on resolving the console errors first');
    expect(suggestions).toContain('Check for JavaScript runtime errors and fix syntax issues');
  });

  test('should suggest reviewing warnings', () => {
    const logs = [{ level: 'warn', message: 'Test warning' }];
    const suggestions = generateSuggestions(logs);
    expect(suggestions).toContain('Review console warnings for potential performance issues');
  });

  test('should suggest checking network requests', () => {
    const logs = [{ type: 'network', message: 'Test network error' }];
    const suggestions = generateSuggestions(logs);
    expect(suggestions).toContain('Check network requests and API endpoints');
  });

  test('should return all suggestions for mixed logs', () => {
    const logs = [
      { level: 'error', message: 'Test error' },
      { level: 'warn', message: 'Test warning' },
      { type: 'network', message: 'Test network error' },
    ];
    const suggestions = generateSuggestions(logs);
    expect(suggestions).toContain('Focus on resolving the console errors first');
    expect(suggestions).toContain('Check for JavaScript runtime errors and fix syntax issues');
    expect(suggestions).toContain('Review console warnings for potential performance issues');
    expect(suggestions).toContain('Check network requests and API endpoints');
  });
});
