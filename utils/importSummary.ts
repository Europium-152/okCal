export interface ImportCounts {
  entriesAdded: number;
  /** Existing entries removed and replaced by imported ones (overwrite mode) */
  entriesReplaced: number;
  /** Imported entries that were not written because the date already had data */
  entriesSkipped: number;
}

const entries = (n: number) => `${n} ${n === 1 ? 'entry' : 'entries'}`;

/**
 * Summary lines for an import result. Added is always shown; replaced and
 * skipped only when they happened, so each line describes what really occurred.
 */
export function formatImportSummary(counts: ImportCounts): string {
  const lines = [`Added: ${entries(counts.entriesAdded)}`];
  if (counts.entriesReplaced > 0) {
    lines.push(`Replaced: ${entries(counts.entriesReplaced)} that already existed`);
  }
  if (counts.entriesSkipped > 0) {
    lines.push(`Skipped: ${entries(counts.entriesSkipped)} (date already has data)`);
  }
  return lines.join('\n');
}
