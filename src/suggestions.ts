import { ConsoleLog } from './types';

export function generateSuggestions(logs: ConsoleLog[]): string[] {
  const suggestions: string[] = [];

  const errors = logs.filter(log => log.level === 'error');
  const warnings = logs.filter(log => log.level === 'warn');

  if (errors.length > 0) {
    suggestions.push('Focus on resolving the console errors first');
    suggestions.push('Check for JavaScript runtime errors and fix syntax issues');
  }

  if (warnings.length > 0) {
    suggestions.push('Review console warnings for potential performance issues');
  }

  const networkErrors = logs.filter(log => log.type === 'network');
  if (networkErrors.length > 0) {
    suggestions.push('Check network requests and API endpoints');
  }

  return suggestions;
}
