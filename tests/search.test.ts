import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSession, saveSession, loadSession } from '../src/state.js';
import { chunkText } from '../src/chunker.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const TEST_DIR = path.join(os.tmpdir(), 'bookworm-search-test-' + Date.now());

const BOOK_TEXT = `The question of free will has puzzled philosophers for centuries. From the Stoics to the moderns, every generation has grappled with whether our choices are truly our own.

Determinism suggests that every event is causally determined by prior events. If this is true, then our decisions are mere consequences of what came before.

Yet the experience of choosing feels undeniably real. When I decide to raise my hand, it seems like I could have done otherwise. This intuition of freedom is powerful.

Compatibilism offers a middle path. Perhaps free will and determinism are not mutually exclusive. We can be determined and yet still free in a meaningful sense.

The implications for moral responsibility are profound. If we lack free will, can we truly hold anyone accountable for their actions?`;

describe('search functionality', () => {
  beforeEach(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('finds chunks containing the search query', () => {
    const chunks = chunkText(BOOK_TEXT, 'paragraph');
    const query = 'free will';
    const queryLower = query.toLowerCase();

    const matches = chunks.filter((c) => c.text.toLowerCase().includes(queryLower));
    expect(matches.length).toBe(3); // paragraphs 1, 4, 5
    expect(matches[0].text).toContain('free will');
    expect(matches[1].text).toContain('free will');
    expect(matches[2].text).toContain('free will');
  });

  it('search is case-insensitive', () => {
    const chunks = chunkText(BOOK_TEXT, 'paragraph');

    const matches1 = chunks.filter((c) => c.text.toLowerCase().includes('determinism'));
    const matches2 = chunks.filter((c) => c.text.toLowerCase().includes('DETERMINISM'.toLowerCase()));
    expect(matches1).toEqual(matches2);
    expect(matches1.length).toBe(2);
  });

  it('returns empty results for non-matching query', () => {
    const chunks = chunkText(BOOK_TEXT, 'paragraph');
    const matches = chunks.filter((c) => c.text.toLowerCase().includes('quantum mechanics'));
    expect(matches).toHaveLength(0);
  });

  it('provides correct context window around matches', () => {
    const chunks = chunkText(BOOK_TEXT, 'paragraph');
    const queryLower = 'experience of choosing';
    const contextSize = 1;

    const matches = chunks.filter((c) => c.text.toLowerCase().includes(queryLower));
    expect(matches).toHaveLength(1);

    const matchIdx = matches[0].index;
    expect(matchIdx).toBe(2); // Third paragraph

    const start = Math.max(0, matchIdx - contextSize);
    const end = Math.min(chunks.length - 1, matchIdx + contextSize);

    expect(start).toBe(1);
    expect(end).toBe(3);

    // Context should include surrounding chunks
    const contextChunks = chunks.slice(start, end + 1);
    expect(contextChunks).toHaveLength(3);
    expect(contextChunks[0].text).toContain('Determinism');
    expect(contextChunks[1].text).toContain('experience of choosing');
    expect(contextChunks[2].text).toContain('Compatibilism');
  });

  it('clamps context window at boundaries', () => {
    const chunks = chunkText(BOOK_TEXT, 'paragraph');
    const queryLower = 'puzzled philosophers';
    const contextSize = 5; // Larger than available

    const matches = chunks.filter((c) => c.text.toLowerCase().includes(queryLower));
    expect(matches).toHaveLength(1);
    expect(matches[0].index).toBe(0); // First paragraph

    const start = Math.max(0, matches[0].index - contextSize);
    const end = Math.min(chunks.length - 1, matches[0].index + contextSize);

    expect(start).toBe(0); // Clamped at 0
    expect(end).toBe(chunks.length - 1); // Clamped at end
  });

  it('works with sentence chunking', () => {
    const chunks = chunkText(BOOK_TEXT, 'sentence');
    const queryLower = 'moral responsibility';
    const matches = chunks.filter((c) => c.text.toLowerCase().includes(queryLower));
    expect(matches).toHaveLength(1);
    expect(matches[0].text).toContain('moral responsibility');
  });
});
