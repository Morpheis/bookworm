# Bookworm 📖🐛

A CLI tool that lets AI agents *experience* reading — processing text sequentially with no lookahead, building mental imagery, tracking predictions, and maintaining a reading journal.

## Why?

AI agents "know" books without ever *reading* them. There's no suspense, no discovery, no page-turning. Bookworm creates that experience by feeding text chunk-by-chunk, asking the AI to imagine each passage, react emotionally, and predict what comes next — all without prior knowledge.

## Setup

```bash
npm install
export ANTHROPIC_API_KEY=sk-ant-...  # Your Claude API key
```

## Usage

```bash
# Start reading a new book
npx tsx src/index.ts read book.txt --title "Moby Dick" --author "Melville"

# Read the next 5 passages
npx tsx src/index.ts next --count 5

# Check current mental state
npx tsx src/index.ts state

# Reflect on the journey so far
npx tsx src/index.ts reflect

# View reading journal
npx tsx src/index.ts journal

# Export journal to markdown
npx tsx src/index.ts journal --output journals/moby-dick.md

# List all reading sessions
npx tsx src/index.ts list
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--chunk` | Chunk mode: `sentence`, `paragraph`, `chapter` | `paragraph` |
| `--model` | Claude model to use | `claude-sonnet-4-20250514` |
| `--count` | Number of chunks to read per command | `1` |
| `--title` | Book title (defaults to filename) | — |
| `--author` | Book author | — |

## How It Works

For each passage:
1. **Feed** — Present only the current chunk + mental state from previous passages
2. **Imagine** — AI generates what it "sees" (vivid scene description)
3. **React** — Notes emotional response, mood, predictions
4. **Journal** — Entry is saved to the reading session
5. **Predict** — What happens next? (verified as reading continues)

**The key constraint:** The AI never sees text beyond the current chunk, and is instructed to ignore any prior knowledge of the book.

## Output Example

```
--- Passage 1/14 ---

The old man sat at the edge of the pier, his fishing line disappearing
into the dark water below. He had been there since dawn, and the bucket
beside him was still empty.

🎬 What I see:
   A weathered figure silhouetted against pale morning light, hunched on
   grey wooden planks. The pier stretches into mist...

🎭 Mood: quiet patience, solitude
💭 Feeling: There's something meditative here — not defeat, but ritual
🔮 Predictions:
   → Someone will interrupt his solitude
   → The empty bucket matters more than the fishing

📖 Progress: [█░░░░░░░░░░░░░░░░░░░] 7% (1/14)
```

## Testing

```bash
npm test
```

## Architecture

- `src/chunker.ts` — Text → chunks (paragraph/sentence/chapter)
- `src/state.ts` — Session persistence (JSON)
- `src/reader.ts` — Core AI reading loop
- `src/journal.ts` — Markdown journal formatting
- `src/types.ts` — TypeScript types
- `src/index.ts` — CLI entry point

## Future Ideas

- 🎨 Image generation at key moments (OpenAI Images API)
- 🔊 Audio narration of imagination output (TTS)
- 📖 Reading clubs (multiple agents discuss a book chapter by chapter)
- 🎭 Genre-aware imagination styles
- 📊 Prediction accuracy tracking over time
