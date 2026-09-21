import { isSafeRelativePath } from './zip-structure.validator';

describe('ZIP path validation', () => {
  it('rejects traversal and absolute paths', () => {
    expect(isSafeRelativePath('../theme.json')).toBe(false);
    expect(isSafeRelativePath('C:/theme.json')).toBe(false);
    expect(isSafeRelativePath('/theme.json')).toBe(false);
    expect(isSafeRelativePath('assets/../theme.json')).toBe(false);
  });
});
