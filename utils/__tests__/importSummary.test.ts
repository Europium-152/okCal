import { formatImportSummary } from '../importSummary';

describe('formatImportSummary', () => {
  it('shows only the added line when nothing was replaced or skipped', () => {
    expect(formatImportSummary({ entriesAdded: 3, entriesReplaced: 0, entriesSkipped: 0 })).toBe(
      'Added: 3 entries'
    );
  });

  it('reports replaced entries as replaced, not skipped', () => {
    const text = formatImportSummary({ entriesAdded: 5, entriesReplaced: 2, entriesSkipped: 0 });
    expect(text).toContain('Added: 5 entries');
    expect(text).toContain('Replaced: 2 entries');
    expect(text).not.toContain('Skipped');
  });

  it('reports skipped entries when dates were left alone', () => {
    const text = formatImportSummary({ entriesAdded: 1, entriesReplaced: 0, entriesSkipped: 4 });
    expect(text).toContain('Skipped: 4 entries');
    expect(text).not.toContain('Replaced');
  });

  it('uses singular for a single entry', () => {
    expect(formatImportSummary({ entriesAdded: 1, entriesReplaced: 1, entriesSkipped: 0 })).toBe(
      'Added: 1 entry\nReplaced: 1 entry that already existed'
    );
  });
});
