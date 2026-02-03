import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSession, saveSession, loadSession, listSessions, getSessionPath } from '../src/state.js';
import { INITIAL_MENTAL_STATE } from '../src/types.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const TEST_DIR = path.join(os.tmpdir(), 'bookworm-test-' + Date.now());

describe('state management', () => {
  beforeEach(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('createSession', () => {
    it('creates a session with required fields', () => {
      const session = createSession('/path/to/book.txt', 'Moby Dick', 100, 'paragraph');
      expect(session.id).toBeTruthy();
      expect(session.bookPath).toBe('/path/to/book.txt');
      expect(session.title).toBe('Moby Dick');
      expect(session.totalChunks).toBe(100);
      expect(session.chunkMode).toBe('paragraph');
      expect(session.currentChunk).toBe(0);
      expect(session.mentalState).toEqual(INITIAL_MENTAL_STATE);
      expect(session.journal).toEqual([]);
      expect(session.startedAt).toBeTruthy();
      expect(session.lastReadAt).toBeTruthy();
    });

    it('generates unique IDs', () => {
      const s1 = createSession('/a.txt', 'A', 10, 'paragraph');
      const s2 = createSession('/b.txt', 'B', 20, 'paragraph');
      expect(s1.id).not.toBe(s2.id);
    });

    it('accepts optional author', () => {
      const session = createSession('/a.txt', 'Moby Dick', 10, 'paragraph', 'Herman Melville');
      expect(session.author).toBe('Herman Melville');
    });
  });

  describe('saveSession / loadSession', () => {
    it('persists and loads a session', () => {
      const session = createSession('/book.txt', 'Test Book', 50, 'paragraph');
      saveSession(session, TEST_DIR);

      const loaded = loadSession(session.id, TEST_DIR);
      expect(loaded).toEqual(session);
    });

    it('preserves journal entries', () => {
      const session = createSession('/book.txt', 'Test', 50, 'paragraph');
      session.journal.push({
        chunkIndex: 0,
        timestamp: new Date().toISOString(),
        chunkText: 'Test chunk',
        imagination: 'I see a test',
        mentalState: { ...INITIAL_MENTAL_STATE, scene: 'A testing room' },
      });
      saveSession(session, TEST_DIR);

      const loaded = loadSession(session.id, TEST_DIR);
      expect(loaded!.journal).toHaveLength(1);
      expect(loaded!.journal[0].imagination).toBe('I see a test');
    });

    it('returns null for nonexistent session', () => {
      const loaded = loadSession('nonexistent-id', TEST_DIR);
      expect(loaded).toBeNull();
    });
  });

  describe('listSessions', () => {
    it('lists all saved sessions', () => {
      const s1 = createSession('/a.txt', 'Book A', 10, 'paragraph');
      const s2 = createSession('/b.txt', 'Book B', 20, 'sentence');
      saveSession(s1, TEST_DIR);
      saveSession(s2, TEST_DIR);

      const sessions = listSessions(TEST_DIR);
      expect(sessions).toHaveLength(2);
      expect(sessions.map((s) => s.title).sort()).toEqual(['Book A', 'Book B']);
    });

    it('returns empty array when no sessions exist', () => {
      const sessions = listSessions(TEST_DIR);
      expect(sessions).toEqual([]);
    });
  });

  describe('getSessionPath', () => {
    it('returns path based on session ID', () => {
      const p = getSessionPath('abc-123', TEST_DIR);
      expect(p).toBe(path.join(TEST_DIR, 'abc-123.json'));
    });
  });
});
