import { issue, scoreForIssues } from './validation-report.types';

describe('theme validation report scoring', () => {
  it('applies bounded deductions by category', () => {
    const errors = [issue('INVALID_IMAGE', 'ERROR', 'bad image')];
    const warnings = [issue('INVALID_IMAGE', 'WARNING', 'image warning')];
    expect(scoreForIssues(errors, warnings, new Set(['INVALID_IMAGE']))).toBe(
      70,
    );
    expect(scoreForIssues(errors, warnings, new Set(['OTHER']))).toBe(100);
  });
});
