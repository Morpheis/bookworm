import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { ReadingSession, ChunkMode } from './types.js';
import { INITIAL_MENTAL_STATE } from './types.js';

const DEFAULT_SESSIONS_DIR = path.join(process.cwd(), 'sessions');

export function createSession(
  bookPath: string,
  title: string,
  totalChunks: number,
  chunkMode: ChunkMode,
  author?: string,
): ReadingSession {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    bookPath,
    title,
    author,
    chunkMode,
    currentChunk: 0,
    totalChunks,
    mentalState: { ...INITIAL_MENTAL_STATE },
    journal: [],
    notes: [],
    startedAt: now,
    lastReadAt: now,
  };
}

export function getSessionPath(sessionId: string, sessionsDir?: string): string {
  const dir = sessionsDir ?? DEFAULT_SESSIONS_DIR;
  return path.join(dir, `${sessionId}.json`);
}

export function saveSession(session: ReadingSession, sessionsDir?: string): void {
  const dir = sessionsDir ?? DEFAULT_SESSIONS_DIR;
  fs.mkdirSync(dir, { recursive: true });
  const filePath = getSessionPath(session.id, dir);
  fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf-8');
}

export function loadSession(sessionId: string, sessionsDir?: string): ReadingSession | null {
  const filePath = getSessionPath(sessionId, sessionsDir);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data) as ReadingSession;
}

export function listSessions(sessionsDir?: string): ReadingSession[] {
  const dir = sessionsDir ?? DEFAULT_SESSIONS_DIR;
  if (!fs.existsSync(dir)) {
    return [];
  }
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  return files.map((f) => {
    const data = fs.readFileSync(path.join(dir, f), 'utf-8');
    return JSON.parse(data) as ReadingSession;
  });
}
