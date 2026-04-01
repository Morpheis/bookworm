#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chunkText } from './chunker.js';
import { createSession, saveSession, loadSession, listSessions } from './state.js';
import { readChunk } from './reader.js';
import { formatJournalEntry, formatFullJournal } from './journal.js';
import { extractText } from './formats.js';
import type { ChunkMode, ReadingSession, JournalEntry } from './types.js';

const SESSIONS_DIR = path.join(process.cwd(), 'sessions');
const JOURNALS_DIR = path.join(process.cwd(), 'journals');

const program = new Command();

program
  .name('bookworm')
  .description('Experience reading — sequential text processing with imagination and reflection')
  .version(JSON.parse(fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf-8')).version);

program
  .command('read')
  .description('Start reading a new book')
  .argument('<file>', 'Path to text file')
  .option('-t, --title <title>', 'Book title (defaults to filename)')
  .option('-a, --author <author>', 'Book author')
  .option('-c, --chunk <mode>', 'Chunk mode: sentence, paragraph, chapter', 'paragraph')
  .option('-m, --model <model>', 'AI model to use', 'claude-sonnet-4-20250514')
  .option('-n, --count <n>', 'Number of chunks to read immediately', '1')
  .action(async (file: string, opts) => {
    const filePath = path.resolve(file);
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      process.exit(1);
    }

    let text: string;
    try {
      text = await extractText(filePath);
    } catch (err) {
      console.error(`Failed to extract text: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
    const title = opts.title ?? path.basename(file, path.extname(file));
    const chunkMode = opts.chunk as ChunkMode;
    const chunks = chunkText(text, chunkMode);

    if (chunks.length === 0) {
      console.error('No content found in file.');
      process.exit(1);
    }

    const session = createSession(filePath, title, chunks.length, chunkMode, opts.author);
    saveSession(session, SESSIONS_DIR);

    console.log(`📖 Starting: "${title}"${opts.author ? ` by ${opts.author}` : ''}`);
    console.log(`   ${chunks.length} ${chunkMode}s to read`);
    console.log(`   Session: ${session.id}\n`);

    const count = parseInt(opts.count, 10);
    await readNext(session, chunks, count, opts.model);
  });

program
  .command('next')
  .description('Read the next chunk(s)')
  .option('-s, --session <id>', 'Session ID (uses most recent if omitted)')
  .option('-n, --count <n>', 'Number of chunks to read', '1')
  .option('-m, --model <model>', 'AI model to use', 'claude-sonnet-4-20250514')
  .action(async (opts) => {
    const session = resolveSession(opts.session);
    if (!session) return;

    let text: string;
    try {
      text = await extractText(session.bookPath);
    } catch (err) {
      console.error(`Failed to extract text: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
    const chunks = chunkText(text, session.chunkMode);
    const count = parseInt(opts.count, 10);

    await readNext(session, chunks, count, opts.model);
  });

program
  .command('list')
  .description('List all reading sessions')
  .action(() => {
    const sessions = listSessions(SESSIONS_DIR);
    if (sessions.length === 0) {
      console.log('No reading sessions yet. Start one with: bookworm read <file>');
      return;
    }

    console.log('📚 Reading Sessions:\n');
    for (const s of sessions) {
      const progress = Math.round((s.currentChunk / s.totalChunks) * 100);
      const bar = progressBar(progress);
      console.log(`  ${s.title}${s.author ? ` by ${s.author}` : ''}`);
      console.log(`  ${bar} ${progress}% (${s.currentChunk}/${s.totalChunks} ${s.chunkMode}s)`);
      console.log(`  ID: ${s.id}`);
      console.log(`  Last read: ${new Date(s.lastReadAt).toLocaleString()}\n`);
    }
  });

program
  .command('journal')
  .description('View or export the reading journal')
  .option('-s, --session <id>', 'Session ID (uses most recent if omitted)')
  .option('-o, --output <file>', 'Export to file')
  .action((opts) => {
    const session = resolveSession(opts.session);
    if (!session) return;

    const md = formatFullJournal(session.title, session.author, session.chunkMode, session.journal);

    if (opts.output) {
      const outPath = path.resolve(opts.output);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, md, 'utf-8');
      console.log(`📓 Journal exported to: ${outPath}`);
    } else {
      console.log(md);
    }
  });

program
  .command('state')
  .description('Show current mental state')
  .option('-s, --session <id>', 'Session ID (uses most recent if omitted)')
  .action((opts) => {
    const session = resolveSession(opts.session);
    if (!session) return;

    const { mentalState: ms, currentChunk, totalChunks, title } = session;
    const progress = Math.round((currentChunk / totalChunks) * 100);

    console.log(`🧠 Mental State — "${title}" (${progress}% read)\n`);
    console.log(`  Scene: ${ms.scene || '(not yet established)'}`);
    console.log(`  Characters: ${ms.charactersPresent.length > 0 ? ms.charactersPresent.join(', ') : '(none yet)'}`);
    console.log(`  Mood: ${ms.mood || '(not yet established)'}`);
    console.log(`  Feeling: ${ms.emotionalResponse || '(nothing yet)'}`);

    if (ms.predictions.length > 0) {
      console.log(`\n  Predictions:`);
      ms.predictions.forEach((p) => console.log(`    → ${p}`));
    }
    if (ms.questions.length > 0) {
      console.log(`\n  Questions:`);
      ms.questions.forEach((q) => console.log(`    ? ${q}`));
    }
    console.log();
  });

program
  .command('reflect')
  .description('Pause and reflect on what has been read so far')
  .option('-s, --session <id>', 'Session ID (uses most recent if omitted)')
  .option('-m, --model <model>', 'AI model to use', 'claude-sonnet-4-20250514')
  .action(async (opts) => {
    const session = resolveSession(opts.session);
    if (!session) return;

    if (session.journal.length === 0) {
      console.log('Nothing to reflect on yet — start reading first!');
      return;
    }

    console.log(`\n🤔 Reflecting on "${session.title}" (${session.currentChunk}/${session.totalChunks} read)...\n`);

    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic();

    const journalSummary = session.journal
      .slice(-10)
      .map((e) => `[Passage ${e.chunkIndex + 1}] ${e.chunkText.slice(0, 100)}...\nImagined: ${e.imagination}\nFelt: ${e.mentalState.emotionalResponse}`)
      .join('\n\n');

    const response = await client.messages.create({
      model: opts.model,
      max_tokens: 1024,
      system: 'You are an AI reflecting on a reading experience. Be introspective, honest, and thoughtful. What themes are emerging? What surprised you? How is the story affecting you? What are you most curious about?',
      messages: [{
        role: 'user',
        content: `Here are your recent reading journal entries for "${session.title}":\n\n${journalSummary}\n\nCurrent mental state:\n${JSON.stringify(session.mentalState, null, 2)}\n\nReflect on your reading experience so far. What stands out? What themes do you see? How do you feel about this story?`,
      }],
    });

    const text = response.content.find((b) => b.type === 'text');
    if (text && text.type === 'text') {
      console.log(text.text);
    }
    console.log();
  });

program
  .command('search')
  .description('Search for text across the book')
  .argument('<query>', 'Text to search for')
  .option('-s, --session <id>', 'Session ID (uses most recent if omitted)')
  .option('-c, --context <n>', 'Number of surrounding chunks to show', '2')
  .action(async (query: string, opts) => {
    const session = resolveSession(opts.session);
    if (!session) return;

    let text: string;
    try {
      text = await extractText(session.bookPath);
    } catch (err) {
      console.error(`Failed to extract text: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
    const chunks = chunkText(text, session.chunkMode);
    const contextSize = parseInt(opts.context, 10);
    const queryLower = query.toLowerCase();

    const matches = chunks.filter((c) => c.text.toLowerCase().includes(queryLower));

    if (matches.length === 0) {
      console.log(`No matches found for "${query}".`);
      return;
    }

    console.log(`🔍 Found ${matches.length} match${matches.length === 1 ? '' : 'es'} for "${query}":\n`);

    for (const match of matches) {
      const start = Math.max(0, match.index - contextSize);
      const end = Math.min(chunks.length - 1, match.index + contextSize);

      console.log(`--- Match in ${session.chunkMode} ${match.index + 1} ---\n`);

      for (let i = start; i <= end; i++) {
        const prefix = i === match.index ? '>>> ' : '    ';
        const label = `[${session.chunkMode} ${i + 1}]`;
        // Truncate long chunks for display
        const preview = chunks[i].text.length > 200
          ? chunks[i].text.slice(0, 200) + '...'
          : chunks[i].text;
        console.log(`${prefix}${label} ${preview}`);
      }
      console.log();
    }
  });

program
  .command('note')
  .description('Add a note/annotation')
  .argument('<text>', 'Note text')
  .option('-s, --session <id>', 'Session ID (uses most recent if omitted)')
  .option('-c, --chunk <n>', 'Chunk index to annotate (defaults to current position)')
  .action((text: string, opts) => {
    const session = resolveSession(opts.session);
    if (!session) return;

    const chunkIndex = opts.chunk !== undefined
      ? parseInt(opts.chunk, 10)
      : Math.max(0, session.currentChunk - 1);

    // Initialize notes array for older sessions
    if (!session.notes) {
      session.notes = [];
    }

    session.notes.push({
      chunkIndex,
      text,
      timestamp: new Date().toISOString(),
    });

    saveSession(session, SESSIONS_DIR);
    console.log(`📝 Note added at ${session.chunkMode} ${chunkIndex + 1}: "${text}"`);
  });

program
  .command('notes')
  .description('List all notes for a session')
  .option('-s, --session <id>', 'Session ID (uses most recent if omitted)')
  .action((opts) => {
    const session = resolveSession(opts.session);
    if (!session) return;

    const notes = session.notes ?? [];

    if (notes.length === 0) {
      console.log('No notes yet. Add one with: bookworm note "your note"');
      return;
    }

    console.log(`📝 Notes for "${session.title}":\n`);
    for (const note of notes) {
      const time = new Date(note.timestamp).toLocaleString();
      console.log(`  [${session.chunkMode} ${note.chunkIndex + 1}] ${note.text}`);
      console.log(`  ${time}\n`);
    }
  });

// --- Helpers ---

async function readNext(
  session: ReadingSession,
  chunks: ReturnType<typeof chunkText>,
  count: number,
  model: string,
): Promise<void> {
  const remaining = session.totalChunks - session.currentChunk;
  const toRead = Math.min(count, remaining);

  if (toRead === 0) {
    console.log('📕 You have finished reading this book!');
    return;
  }

  for (let i = 0; i < toRead; i++) {
    const chunkIdx = session.currentChunk;
    const chunk = chunks[chunkIdx];

    console.log(`--- Passage ${chunkIdx + 1}/${session.totalChunks} ---\n`);
    console.log(chunk.text);
    console.log();

    try {
      const output = await readChunk(chunk, session.mentalState, { model });

      // Display imagination
      console.log(`🎬 What I see:`);
      console.log(`   ${output.imagination}\n`);
      console.log(`🎭 Mood: ${output.mentalState.mood}`);
      console.log(`💭 Feeling: ${output.mentalState.emotionalResponse}`);

      if (output.mentalState.predictions.length > 0) {
        console.log(`🔮 Predictions:`);
        output.mentalState.predictions.forEach((p) => console.log(`   → ${p}`));
      }
      console.log();

      // Create journal entry
      const entry: JournalEntry = {
        chunkIndex: chunkIdx,
        timestamp: new Date().toISOString(),
        chunkText: chunk.text,
        imagination: output.imagination,
        mentalState: output.mentalState,
      };

      // Update session
      session.mentalState = output.mentalState;
      session.journal.push(entry);
      session.currentChunk = chunkIdx + 1;
      session.lastReadAt = new Date().toISOString();

      saveSession(session, SESSIONS_DIR);
    } catch (err) {
      console.error(`Error reading chunk ${chunkIdx + 1}:`, err instanceof Error ? err.message : err);
      break;
    }
  }

  const progress = Math.round((session.currentChunk / session.totalChunks) * 100);
  console.log(`📖 Progress: ${progressBar(progress)} ${progress}% (${session.currentChunk}/${session.totalChunks})`);

  if (session.currentChunk >= session.totalChunks) {
    console.log('\n📕 You have finished the book! Use `bookworm reflect` to look back on the journey.');
  }
}

function resolveSession(sessionId?: string): ReadingSession | null {
  if (sessionId) {
    const session = loadSession(sessionId, SESSIONS_DIR);
    if (!session) {
      console.error(`Session not found: ${sessionId}`);
      return null;
    }
    return session;
  }

  // Find most recent session
  const sessions = listSessions(SESSIONS_DIR);
  if (sessions.length === 0) {
    console.error('No reading sessions found. Start one with: bookworm read <file>');
    return null;
  }

  sessions.sort((a, b) => new Date(b.lastReadAt).getTime() - new Date(a.lastReadAt).getTime());
  return sessions[0];
}

function progressBar(percent: number, width = 20): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

program
  .command('skill')
  .description('Display the SKILL.md — teaches agents how to use bookworm')
  .option('--path', 'Print the file path instead of the content')
  .action((opts) => {
    const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const skillPath = path.join(packageRoot, 'skill', 'SKILL.md');

    if (!fs.existsSync(skillPath)) {
      console.error(`SKILL.md not found at ${skillPath}`);
      process.exit(1);
    }

    if (opts.path) {
      console.log(skillPath);
    } else {
      console.log(fs.readFileSync(skillPath, 'utf-8'));
    }
  });

program.parse();
