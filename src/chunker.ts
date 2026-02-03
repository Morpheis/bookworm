import type { Chunk, ChunkMode } from './types.js';

/**
 * Split text into chunks based on the specified mode.
 */
export function chunkText(text: string, mode: ChunkMode): Chunk[] {
  switch (mode) {
    case 'paragraph':
      return chunkByParagraph(text);
    case 'sentence':
      return chunkBySentence(text);
    case 'chapter':
      return chunkByChapter(text);
  }
}

function chunkByParagraph(text: string): Chunk[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p, i) => ({ index: i, text: p }));
}

function chunkBySentence(text: string): Chunk[] {
  // Normalize line breaks within paragraphs (preserve paragraph breaks)
  const normalized = text.replace(/(?<!\n)\n(?!\n)/g, ' ');

  // Split on sentence-ending punctuation followed by space or end
  // Handle common abbreviations (Dr., Mr., Mrs., Ms., St., etc.) and decimals
  const sentences: string[] = [];
  let current = '';

  const abbrevPattern = /^(?:Dr|Mr|Mrs|Ms|St|Jr|Sr|Prof|Rev|Gen|Corp|Inc|Ltd|etc|vs|approx|dept|est|govt|avg)\./i;

  for (let i = 0; i < normalized.length; i++) {
    current += normalized[i];

    if (normalized[i] === '.' || normalized[i] === '?' || normalized[i] === '!') {
      const nextChar = normalized[i + 1];
      const isEnd = nextChar === undefined || nextChar === ' ' || nextChar === '\n';

      if (!isEnd) continue;

      // Check for abbreviations
      if (normalized[i] === '.') {
        // Look back to find the word before the period
        const lastSpace = current.lastIndexOf(' ', current.length - 2);
        const lastWord = current.slice(lastSpace + 1);
        if (abbrevPattern.test(lastWord)) continue;

        // Check for decimals (digit.digit)
        if (i > 0 && /\d/.test(normalized[i - 1]) && nextChar && /\d/.test(normalized[i + 1])) {
          continue;
        }
      }

      sentences.push(current.trim());
      current = '';
    }
  }

  if (current.trim()) {
    sentences.push(current.trim());
  }

  return sentences
    .filter((s) => s.length > 0)
    .map((s, i) => ({ index: i, text: s }));
}

function chunkByChapter(text: string): Chunk[] {
  // Match common chapter heading patterns
  const chapterPattern = /^(?:Chapter|CHAPTER)\s+(\d+)/m;

  // Split on chapter headings
  const parts = text.split(/(?=^(?:Chapter|CHAPTER)\s+\d+)/m);

  const chunks: Chunk[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const match = trimmed.match(chapterPattern);
    const chunk: Chunk = {
      index: chunks.length,
      text: trimmed,
    };

    if (match) {
      chunk.chapter = parseInt(match[1], 10);
    }

    chunks.push(chunk);
  }

  // If no chapters were detected (no chapter markers), return single chunk
  // unless there's content before chapter 1
  if (chunks.length === 1 && !chunks[0].chapter) {
    return chunks;
  }

  return chunks;
}
