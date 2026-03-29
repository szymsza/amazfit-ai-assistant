/**
 * Truncate text to 40-70 words, preferring sentence boundaries.
 * - If text <= 70 words, return as-is
 * - Otherwise, truncate to 70 words max
 * - Try to cut at the last sentence boundary within those 70 words
 * - Only use the boundary if it's >= 40 words (avoid cutting to too few words)
 * - Fallback: return 70 words even if mid-sentence
 */
export function truncateForTts(text: string): string {
  const MIN_WORDS = 40;
  const MAX_WORDS = 70;

  const words = text.split(/\s+/);

  // If text is short enough, return as-is
  if (words.length <= MAX_WORDS) return text;

  // Truncate to MAX_WORDS
  const truncatedAtMax = words.slice(0, MAX_WORDS).join(' ');

  // Try to find a sentence boundary to cut at
  const lastSentenceEnd = Math.max(
    truncatedAtMax.lastIndexOf('.'),
    truncatedAtMax.lastIndexOf('!'),
    truncatedAtMax.lastIndexOf('?'),
  );

  if (lastSentenceEnd > 0) {
    const atBoundary = truncatedAtMax.slice(0, lastSentenceEnd + 1);
    const boundaryWords = atBoundary.split(/\s+/).length;

    // If sentence boundary keeps us within the acceptable range, use it
    if (boundaryWords >= MIN_WORDS) {
      return atBoundary;
    }
  }

  // Fallback: return the hard MAX_WORDS limit (even mid-sentence)
  return truncatedAtMax;
}
