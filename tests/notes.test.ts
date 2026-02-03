import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSession, saveSession, loadSession } from '../src/state.js';
import type { Note } from '../src/types.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const TEST_DIR = path.join(os.tmpdir(), 'bookworm-notes-test-' + Date.now());

describe('notes', () => {
  beforeEach(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('storage', () => {
    it('session is created with empty notes array', () => {
      const session = createSession('/book.txt', 'Test Book', 50, 'paragraph');
      expect(session.notes).toEqual([]);
    });

    it('adds a note to a session', () => {
      const session = createSession('/book.txt', 'Test Book', 50, 'paragraph');

      const note: Note = {
        chunkIndex: 5,
        text: 'This reminds me of Aquinas',
        timestamp: new Date().toISOString(),
      };

      session.notes.push(note);
      saveSession(session, TEST_DIR);

      const loaded = loadSession(session.id, TEST_DIR);
      expect(loaded!.notes).toHaveLength(1);
      expect(loaded!.notes[0].text).toBe('This reminds me of Aquinas');
      expect(loaded!.notes[0].chunkIndex).toBe(5);
    });

    it('adds multiple notes', () => {
      const session = createSession('/book.txt', 'Test Book', 50, 'paragraph');

      session.notes.push({
        chunkIndex: 0,
        text: 'Great opening',
        timestamp: new Date().toISOString(),
      });

      session.notes.push({
        chunkIndex: 3,
        text: 'Interesting argument',
        timestamp: new Date().toISOString(),
      });

      session.notes.push({
        chunkIndex: 7,
        text: 'Reminds me of Kant',
        timestamp: new Date().toISOString(),
      });

      saveSession(session, TEST_DIR);

      const loaded = loadSession(session.id, TEST_DIR);
      expect(loaded!.notes).toHaveLength(3);
      expect(loaded!.notes[0].text).toBe('Great opening');
      expect(loaded!.notes[1].text).toBe('Interesting argument');
      expect(loaded!.notes[2].text).toBe('Reminds me of Kant');
    });

    it('preserves note timestamps', () => {
      const session = createSession('/book.txt', 'Test Book', 50, 'paragraph');
      const timestamp = '2024-01-15T10:30:00.000Z';

      session.notes.push({
        chunkIndex: 2,
        text: 'Important note',
        timestamp,
      });

      saveSession(session, TEST_DIR);

      const loaded = loadSession(session.id, TEST_DIR);
      expect(loaded!.notes[0].timestamp).toBe(timestamp);
    });

    it('notes coexist with journal entries', () => {
      const session = createSession('/book.txt', 'Test Book', 50, 'paragraph');

      session.journal.push({
        chunkIndex: 0,
        timestamp: new Date().toISOString(),
        chunkText: 'Some text',
        imagination: 'I see a test',
        mentalState: {
          scene: 'A testing room',
          charactersPresent: [],
          mood: 'curious',
          predictions: [],
          questions: [],
          emotionalResponse: 'Interesting',
        },
      });

      session.notes.push({
        chunkIndex: 0,
        text: 'Annotating the first chunk',
        timestamp: new Date().toISOString(),
      });

      saveSession(session, TEST_DIR);

      const loaded = loadSession(session.id, TEST_DIR);
      expect(loaded!.journal).toHaveLength(1);
      expect(loaded!.notes).toHaveLength(1);
      expect(loaded!.journal[0].imagination).toBe('I see a test');
      expect(loaded!.notes[0].text).toBe('Annotating the first chunk');
    });
  });

  describe('retrieval', () => {
    it('retrieves notes sorted by insertion order', () => {
      const session = createSession('/book.txt', 'Test Book', 50, 'paragraph');

      // Add notes out of chunk order
      session.notes.push({
        chunkIndex: 10,
        text: 'Later note',
        timestamp: '2024-01-15T12:00:00.000Z',
      });

      session.notes.push({
        chunkIndex: 2,
        text: 'Earlier note',
        timestamp: '2024-01-15T12:01:00.000Z',
      });

      saveSession(session, TEST_DIR);

      const loaded = loadSession(session.id, TEST_DIR);
      // Notes maintain insertion order
      expect(loaded!.notes[0].chunkIndex).toBe(10);
      expect(loaded!.notes[1].chunkIndex).toBe(2);
    });

    it('can filter notes by chunk index', () => {
      const session = createSession('/book.txt', 'Test Book', 50, 'paragraph');

      session.notes.push(
        { chunkIndex: 1, text: 'Note A', timestamp: new Date().toISOString() },
        { chunkIndex: 3, text: 'Note B', timestamp: new Date().toISOString() },
        { chunkIndex: 1, text: 'Note C', timestamp: new Date().toISOString() },
        { chunkIndex: 5, text: 'Note D', timestamp: new Date().toISOString() },
      );

      saveSession(session, TEST_DIR);

      const loaded = loadSession(session.id, TEST_DIR);
      const chunk1Notes = loaded!.notes.filter((n) => n.chunkIndex === 1);
      expect(chunk1Notes).toHaveLength(2);
      expect(chunk1Notes[0].text).toBe('Note A');
      expect(chunk1Notes[1].text).toBe('Note C');
    });

    it('handles session with no notes gracefully', () => {
      const session = createSession('/book.txt', 'Test Book', 50, 'paragraph');
      saveSession(session, TEST_DIR);

      const loaded = loadSession(session.id, TEST_DIR);
      expect(loaded!.notes).toEqual([]);
    });
  });
});
