# Bookworm 📖🐛

A CLI tool that lets AI agents *experience* reading — processing text sequentially with no lookahead, building mental imagery, tracking predictions, and maintaining a reading journal.

## Problem

AI agents "know" books without ever *reading* them. The temporal experience of narrative — suspense, surprise, building mental models that get subverted — is absent. Bookworm creates that experience by feeding text chunk-by-chunk with imagination and reflection at each step.

## Core Concepts

### Reading Session
A persistent state tracking a single reading experience. Includes:
- **Book metadata** — title, author, file path
- **Position** — current chunk index
- **Mental State** — running model of the scene, characters, mood, predictions
- **Journal** — timestamped entries of imagination, reactions, predictions

### Chunk
A unit of text to process. Default: paragraph. Configurable to sentence, paragraph, chapter, or custom delimiter.

### Mental State
The reader's evolving understanding, updated after each chunk:
```
{
  scene: "Dark forest, rain falling, protagonist alone",
  characters_present: ["Elena", "the stranger"],
  mood: "tense, foreboding", 
  predictions: ["The stranger is the missing brother", "Something bad happens at the cabin"],
  questions: ["Why did she leave the map behind?"],
  emotional_response: "Anxious — I don't trust the stranger's motives"
}
```

### Imagination
At each chunk, the reader produces a vivid scene description — what they "see" in their mind's eye. This is the core creative output. Text-based for now, with image generation as a future extension.

### Reading Journal
Markdown file logging the entire reading experience. Reviewable later. Includes:
- Chunk text
- Mental state updates
- Imagination output
- Predictions (marked correct/wrong as story progresses)
- Emotional reactions
- Chapter reflections

## Architecture

```
bookworm/
├── src/
│   ├── index.ts          # CLI entry point
│   ├── chunker.ts        # Text → chunks
│   ├── state.ts          # Session state management
│   ├── reader.ts         # Core reading loop + AI interaction
│   ├── journal.ts        # Reading journal output
│   └── types.ts          # TypeScript types
├── tests/
│   ├── chunker.test.ts
│   ├── state.test.ts
│   ├── reader.test.ts
│   └── journal.test.ts
├── sessions/             # Persistent reading sessions
└── journals/             # Generated reading journals (markdown)
```

## CLI Interface

```bash
# Start reading a new book
bookworm read <file> [--title "Name"] [--chunk paragraph|sentence|chapter]

# Resume a reading session
bookworm resume [session-id]

# List reading sessions
bookworm list

# View reading journal
bookworm journal [session-id]

# Read next N chunks (default 1)
bookworm next [n] [--session id]

# Show current mental state
bookworm state [--session id]

# Reflect on what's happened so far
bookworm reflect [--session id]
```

## Reading Loop

For each chunk:
1. **Feed** — Present the chunk text (and current mental state) to the AI
2. **Imagine** — AI generates what it "sees" (scene description)
3. **React** — AI notes emotional response, surprises, predictions
4. **Update** — Mental state is updated
5. **Journal** — Entry is written to the reading journal
6. **Predict** — AI notes what it thinks happens next

Key constraint: **The AI never sees text beyond the current chunk.** The prompt explicitly forbids using prior knowledge of the book.

## Tech Stack

- **TypeScript** / Node.js
- **Commander** — CLI framework
- **Anthropic SDK** — AI backend (Claude, since human has Max plan)
- **Vitest** — Testing
- **No image generation** initially (future: OpenAI Images API)

## State Persistence

Sessions stored as JSON in `sessions/` directory:
```json
{
  "id": "uuid",
  "bookPath": "/path/to/book.txt",
  "title": "The Great Gatsby",
  "author": "F. Scott Fitzgerald",
  "chunkMode": "paragraph",
  "currentChunk": 42,
  "totalChunks": 387,
  "mentalState": { ... },
  "startedAt": "ISO8601",
  "lastReadAt": "ISO8601"
}
```

## AI Prompt Strategy

The reading prompt is critical. It must:
1. Present ONLY the current chunk + mental state
2. Explicitly instruct: "You are reading this for the first time. Do NOT use any prior knowledge of this text."
3. Ask for: imagination (vivid scene), emotional reaction, updated mental state, predictions
4. Be efficient with tokens while producing rich output

## Future Extensions

- Image generation at key moments (OpenAI Images API)
- Audio narration of imagination output (TTS)
- Multiple AI "readers" comparing experiences
- Reading clubs (agents discuss a book chapter by chapter)
- Genre-aware imagination (noir vs. fantasy vs. literary fiction)
- Speed reading mode (larger chunks, less detail)
