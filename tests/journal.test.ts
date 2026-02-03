import { describe, it, expect } from 'vitest';
import { formatJournalEntry, formatJournalHeader, formatFullJournal } from '../src/journal.js';
import type { JournalEntry, ReadingSession } from '../src/types.js';
import { INITIAL_MENTAL_STATE } from '../src/types.js';

const sampleEntry: JournalEntry = {
  chunkIndex: 0,
  timestamp: '2026-02-03T12:00:00Z',
  chunkText: 'Call me Ishmael.',
  imagination: 'I see a weathered sailor standing at the bow of a ship, salt spray in his face, eyes fixed on the horizon.',
  mentalState: {
    scene: 'A ship at sea, early morning',
    charactersPresent: ['Ishmael (narrator)'],
    mood: 'contemplative, yearning',
    predictions: ['This is a sea adventure', 'Something about a whale'],
    questions: ['Who is Ishmael speaking to?'],
    emotionalResponse: 'Drawn in immediately — the directness of the opening',
  },
};

describe('journal formatting', () => {
  describe('formatJournalEntry', () => {
    it('includes chunk text in blockquote', () => {
      const output = formatJournalEntry(sampleEntry);
      expect(output).toContain('> Call me Ishmael.');
    });

    it('includes imagination section', () => {
      const output = formatJournalEntry(sampleEntry);
      expect(output).toContain('weathered sailor');
    });

    it('includes mental state scene', () => {
      const output = formatJournalEntry(sampleEntry);
      expect(output).toContain('A ship at sea');
    });

    it('includes predictions', () => {
      const output = formatJournalEntry(sampleEntry);
      expect(output).toContain('sea adventure');
      expect(output).toContain('whale');
    });

    it('includes emotional response', () => {
      const output = formatJournalEntry(sampleEntry);
      expect(output).toContain('Drawn in immediately');
    });

    it('includes chunk number (1-indexed for display)', () => {
      const output = formatJournalEntry(sampleEntry);
      expect(output).toContain('Passage 1');
    });
  });

  describe('formatJournalHeader', () => {
    it('includes title', () => {
      const header = formatJournalHeader('Moby Dick', 'Herman Melville', 'paragraph');
      expect(header).toContain('Moby Dick');
    });

    it('includes author when provided', () => {
      const header = formatJournalHeader('Moby Dick', 'Herman Melville', 'paragraph');
      expect(header).toContain('Herman Melville');
    });

    it('handles missing author', () => {
      const header = formatJournalHeader('Moby Dick', undefined, 'paragraph');
      expect(header).toContain('Moby Dick');
      expect(header).not.toContain('undefined');
    });
  });

  describe('formatFullJournal', () => {
    it('combines header and entries', () => {
      const output = formatFullJournal('Moby Dick', 'Melville', 'paragraph', [sampleEntry]);
      expect(output).toContain('Moby Dick');
      expect(output).toContain('Call me Ishmael');
      expect(output).toContain('weathered sailor');
    });

    it('handles empty journal', () => {
      const output = formatFullJournal('Test', undefined, 'paragraph', []);
      expect(output).toContain('Test');
      expect(output).toContain('No entries yet');
    });
  });
});
