/**
 * Relevance-scored fuzzy matching for search-as-you-type lists (history, recipes).
 *
 * A plain "does this match" boolean isn't enough once there are enough entries
 * that multiple items match loosely - without a relevance score, a weak
 * subsequence match (e.g. "doce" matching "...roasteD...pOrk...and riCE...")
 * can rank ahead of a true match ("Doce de alperce") whenever it happens to be
 * more recent. Scoring tiers below make exact/prefix/word matches always
 * outrank a loose subsequence match, regardless of recency.
 */

// Tier boundaries - a match in a higher tier always outranks any match in a
// lower tier, no matter how the within-tier score comes out.
const SCORE_EXACT = 1000;
const SCORE_PREFIX = 900;
const SCORE_WORD_BOUNDARY = 800;
const SCORE_SUBSTRING_MAX = 700;
const SCORE_SUBSEQUENCE_MAX = 300;

/**
 * Score how well `query` matches `text`. Higher is better; null means no match.
 */
export function fuzzyMatchScore(text: string, query: string): number | null {
  const textLower = text.toLowerCase();
  const queryLower = query.trim().toLowerCase();

  if (!queryLower) return 0;

  if (textLower === queryLower) return SCORE_EXACT;

  if (textLower.startsWith(queryLower)) return SCORE_PREFIX;

  const words = textLower.split(/[^a-z0-9]+/).filter(Boolean);
  if (words.some(word => word.startsWith(queryLower))) {
    return SCORE_WORD_BOUNDARY;
  }

  const substringIndex = textLower.indexOf(queryLower);
  if (substringIndex !== -1) {
    // Earlier substring matches score higher, later ones taper down.
    return SCORE_SUBSTRING_MAX - Math.min(substringIndex, 200);
  }

  // Fuzzy fallback: all query characters must appear in order in text.
  let queryIndex = 0;
  let firstMatchIndex = -1;
  let lastMatchIndex = -1;
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      if (firstMatchIndex === -1) firstMatchIndex = i;
      lastMatchIndex = i;
      queryIndex++;
    }
  }

  if (queryIndex !== queryLower.length) return null;

  // Tighter, earlier subsequence matches score higher, but a subsequence
  // match can never reach the substring tier above.
  const span = lastMatchIndex - firstMatchIndex + 1;
  return Math.max(0, SCORE_SUBSEQUENCE_MAX - span - firstMatchIndex);
}

export function fuzzyMatch(text: string, query: string): boolean {
  return fuzzyMatchScore(text, query) !== null;
}

/**
 * Filter and sort items by relevance to `query`. Non-matches are dropped.
 * When two items score equally, `getRecency` (if given, higher = more recent)
 * breaks the tie so recent items still surface first among equally good matches.
 */
export function sortByRelevance<T>(
  items: T[],
  query: string,
  getText: (item: T) => string,
  getRecency?: (item: T) => number
): T[] {
  if (!query.trim()) return items;

  return items
    .map(item => ({ item, score: fuzzyMatchScore(getText(item), query) }))
    .filter((scored): scored is { item: T; score: number } => scored.score !== null)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (getRecency) return getRecency(b.item) - getRecency(a.item);
      return 0;
    })
    .map(scored => scored.item);
}
