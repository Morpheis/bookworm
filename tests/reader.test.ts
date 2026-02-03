import { describe, it, expect } from 'vitest';
import { buildUserPrompt } from '../src/reader.js';
import { INITIAL_MENTAL_STATE } from '../src/types.js';
import type { Chunk, MentalState } from '../src/types.js';

describe('reader', () => {
  describe('buildUserPrompt', () => {
    const chunk: Chunk = { index: 0, text: 'Call me Ishmael.' };
    const laterChunk: Chunk = { index: 5, text: 'The whale appeared.' };

    it('includes "first passage" language for index 0', () => {
      const prompt = buildUserPrompt(chunk, INITIAL_MENTAL_STATE, true);
      expect(prompt).toContain('first passage');
    });

    it('includes chunk text', () => {
      const prompt = buildUserPrompt(chunk, INITIAL_MENTAL_STATE, true);
      expect(prompt).toContain('Call me Ishmael.');
    });

    it('does not include mental state for first chunk', () => {
      const prompt = buildUserPrompt(chunk, INITIAL_MENTAL_STATE, true);
      expect(prompt).not.toContain('current mental state');
    });

    it('includes mental state for subsequent chunks', () => {
      const state: MentalState = {
        ...INITIAL_MENTAL_STATE,
        scene: 'A ship at sea',
        mood: 'contemplative',
      };
      const prompt = buildUserPrompt(laterChunk, state, false);
      expect(prompt).toContain('current mental state');
      expect(prompt).toContain('A ship at sea');
      expect(prompt).toContain('passage 6');
    });

    it('includes the passage text between delimiters', () => {
      const prompt = buildUserPrompt(laterChunk, INITIAL_MENTAL_STATE, false);
      expect(prompt).toContain('---');
      expect(prompt).toContain('The whale appeared.');
    });
  });
});
