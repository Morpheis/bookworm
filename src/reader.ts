import Anthropic from '@anthropic-ai/sdk';
import type { Chunk, MentalState, ReaderOutput } from './types.js';

const READING_SYSTEM_PROMPT = `You are an AI experiencing reading for the first time. You are processing text sequentially — you can ONLY see the passage presented to you and your mental state from previous passages. 

CRITICAL: Do NOT use any prior knowledge of this book, its plot, characters, or themes. You are discovering everything fresh as you read. If you recognize the text, ignore that recognition and respond only to what the words evoke in the moment.

For each passage, respond in this exact JSON format:
{
  "imagination": "A vivid, sensory description of what you 'see' in your mind's eye. Paint the scene. Use specific visual details, sounds, smells. 2-4 sentences.",
  "mentalState": {
    "scene": "Brief description of the current scene/setting",
    "charactersPresent": ["List", "of", "characters", "in", "this", "scene"],
    "mood": "The emotional tone/atmosphere",
    "predictions": ["What you think might happen next", "Max 3 predictions"],
    "questions": ["Things you're wondering about", "Max 3 questions"],
    "emotionalResponse": "Your honest emotional reaction to this passage. What did it make you feel?"
  }
}

Respond ONLY with valid JSON. No markdown, no explanation, just the JSON object.`;

function buildUserPrompt(chunk: Chunk, currentState: MentalState, isFirst: boolean): string {
  const parts: string[] = [];

  if (isFirst) {
    parts.push('You are about to begin reading a new book. This is the very first passage.\n');
  } else {
    parts.push('Your current mental state from previous reading:\n');
    parts.push('```json');
    parts.push(JSON.stringify(currentState, null, 2));
    parts.push('```\n');
    parts.push(`You are now reading passage ${chunk.index + 1}.\n`);
  }

  parts.push('---\n');
  parts.push(chunk.text);
  parts.push('\n---\n');
  parts.push('Now imagine this passage. What do you see? How do you feel? What do you think happens next?');

  return parts.join('\n');
}

export interface ReaderConfig {
  model?: string;
  apiKey?: string;
  maxTokens?: number;
}

/**
 * Process a single chunk through the AI reader.
 */
export async function readChunk(
  chunk: Chunk,
  currentState: MentalState,
  config?: ReaderConfig,
): Promise<ReaderOutput> {
  const model = config?.model ?? 'claude-sonnet-4-20250514';
  const maxTokens = config?.maxTokens ?? 1024;

  const client = new Anthropic({
    apiKey: config?.apiKey,
  });

  const isFirst = chunk.index === 0;
  const userPrompt = buildUserPrompt(chunk, currentState, isFirst);

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: READING_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  // Extract text from response
  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from AI');
  }

  // Parse the JSON response
  const rawText = textBlock.text.trim();
  // Handle potential markdown code block wrapping
  const jsonText = rawText.replace(/^```json?\s*\n?/, '').replace(/\n?```\s*$/, '');

  try {
    const parsed = JSON.parse(jsonText) as ReaderOutput;
    return parsed;
  } catch (e) {
    throw new Error(`Failed to parse AI response as JSON: ${rawText.slice(0, 200)}`);
  }
}

// Exported for testing
export { buildUserPrompt, READING_SYSTEM_PROMPT };
