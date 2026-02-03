import type { JournalEntry, ChunkMode } from './types.js';

/**
 * Format a single journal entry as markdown.
 */
export function formatJournalEntry(entry: JournalEntry): string {
  const { chunkIndex, timestamp, chunkText, imagination, mentalState } = entry;
  const passageNum = chunkIndex + 1;

  const lines: string[] = [
    `### Passage ${passageNum}`,
    '',
    `*${new Date(timestamp).toLocaleString()}*`,
    '',
    '**Text:**',
    '',
    ...chunkText.split('\n').map((line) => `> ${line}`),
    '',
    '**What I see:**',
    '',
    imagination,
    '',
    '**Scene:** ' + mentalState.scene,
    '',
    '**Characters present:** ' + (mentalState.charactersPresent.length > 0
      ? mentalState.charactersPresent.join(', ')
      : '*none yet*'),
    '',
    '**Mood:** ' + mentalState.mood,
    '',
    '**Emotional response:** ' + mentalState.emotionalResponse,
    '',
  ];

  if (mentalState.predictions.length > 0) {
    lines.push('**Predictions:**');
    for (const p of mentalState.predictions) {
      lines.push(`- ${p}`);
    }
    lines.push('');
  }

  if (mentalState.questions.length > 0) {
    lines.push('**Questions:**');
    for (const q of mentalState.questions) {
      lines.push(`- ${q}`);
    }
    lines.push('');
  }

  if (entry.predictionsResolved && entry.predictionsResolved.length > 0) {
    lines.push('**Predictions resolved:**');
    for (const pr of entry.predictionsResolved) {
      const icon = pr.correct ? '✅' : '❌';
      lines.push(`- ${icon} ${pr.prediction}${pr.note ? ` — ${pr.note}` : ''}`);
    }
    lines.push('');
  }

  lines.push('---', '');

  return lines.join('\n');
}

/**
 * Format the journal header.
 */
export function formatJournalHeader(
  title: string,
  author: string | undefined,
  chunkMode: ChunkMode,
): string {
  const lines = [
    `# Reading Journal: ${title}`,
    '',
  ];

  if (author) {
    lines.push(`**Author:** ${author}`, '');
  }

  lines.push(
    `**Reading mode:** ${chunkMode}`,
    `**Started:** ${new Date().toLocaleString()}`,
    '',
    '---',
    '',
  );

  return lines.join('\n');
}

/**
 * Format a complete reading journal.
 */
export function formatFullJournal(
  title: string,
  author: string | undefined,
  chunkMode: ChunkMode,
  entries: JournalEntry[],
): string {
  const header = formatJournalHeader(title, author, chunkMode);

  if (entries.length === 0) {
    return header + '*No entries yet — reading has not started.*\n';
  }

  const body = entries.map((e) => formatJournalEntry(e)).join('\n');
  return header + body;
}
