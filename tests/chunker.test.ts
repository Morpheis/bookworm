import { describe, it, expect } from 'vitest';
import { chunkText } from '../src/chunker.js';

const SAMPLE_TEXT = `Call me Ishmael. Some years ago—never mind how long precisely—having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world.

It is a way I have of driving off the spleen and regulating the circulation. Whenever I find myself growing grim about the mouth; whenever it is a damp, drizzly November in my soul; I thought I would step aboard.

There now is your insular city of the Manhattoes, belted round by wharves as Indian isles by coral reefs.`;

const CHAPTER_TEXT = `Chapter 1: The Beginning

It was a dark and stormy night. The wind howled through the trees.

Rain pelted the windows of the old house.

Chapter 2: The Discovery

She found the letter hidden under the floorboard. The handwriting was unmistakable.

Her hands trembled as she read the first line.`;

describe('chunkText', () => {
  describe('paragraph mode', () => {
    it('splits text into paragraphs separated by blank lines', () => {
      const chunks = chunkText(SAMPLE_TEXT, 'paragraph');
      expect(chunks).toHaveLength(3);
      expect(chunks[0].index).toBe(0);
      expect(chunks[0].text).toContain('Call me Ishmael');
      expect(chunks[1].text).toContain('driving off the spleen');
      expect(chunks[2].text).toContain('insular city');
    });

    it('assigns sequential indices', () => {
      const chunks = chunkText(SAMPLE_TEXT, 'paragraph');
      chunks.forEach((chunk, i) => {
        expect(chunk.index).toBe(i);
      });
    });

    it('trims whitespace from chunks', () => {
      const chunks = chunkText(SAMPLE_TEXT, 'paragraph');
      chunks.forEach((chunk) => {
        expect(chunk.text).toBe(chunk.text.trim());
      });
    });

    it('filters out empty chunks', () => {
      const textWithExtraBlanks = 'First paragraph.\n\n\n\nSecond paragraph.\n\n\n\n\n';
      const chunks = chunkText(textWithExtraBlanks, 'paragraph');
      expect(chunks).toHaveLength(2);
    });
  });

  describe('sentence mode', () => {
    it('splits text into individual sentences', () => {
      const chunks = chunkText('Hello world. How are you? I am fine!', 'sentence');
      expect(chunks).toHaveLength(3);
      expect(chunks[0].text).toBe('Hello world.');
      expect(chunks[1].text).toBe('How are you?');
      expect(chunks[2].text).toBe('I am fine!');
    });

    it('handles sentences spanning line breaks', () => {
      const text = 'This is a sentence that\ncontinues on the next line. And this is another.';
      const chunks = chunkText(text, 'sentence');
      expect(chunks).toHaveLength(2);
      expect(chunks[0].text).toContain('continues on the next line');
    });

    it('handles abbreviations and decimal numbers', () => {
      const text = 'Dr. Smith went to Washington. He spent $3.50 on lunch.';
      const chunks = chunkText(text, 'sentence');
      expect(chunks).toHaveLength(2);
    });
  });

  describe('chapter mode', () => {
    it('splits text at chapter headings', () => {
      const chunks = chunkText(CHAPTER_TEXT, 'chapter');
      expect(chunks).toHaveLength(2);
    });

    it('includes chapter number in chunk metadata', () => {
      const chunks = chunkText(CHAPTER_TEXT, 'chapter');
      expect(chunks[0].chapter).toBe(1);
      expect(chunks[1].chapter).toBe(2);
    });

    it('includes full chapter text including heading', () => {
      const chunks = chunkText(CHAPTER_TEXT, 'chapter');
      expect(chunks[0].text).toContain('Chapter 1');
      expect(chunks[0].text).toContain('dark and stormy night');
      expect(chunks[1].text).toContain('Chapter 2');
      expect(chunks[1].text).toContain('found the letter');
    });

    it('handles text with no chapter markers as single chunk', () => {
      const chunks = chunkText(SAMPLE_TEXT, 'chapter');
      expect(chunks).toHaveLength(1);
      expect(chunks[0].chapter).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('handles empty string', () => {
      const chunks = chunkText('', 'paragraph');
      expect(chunks).toHaveLength(0);
    });

    it('handles whitespace-only string', () => {
      const chunks = chunkText('   \n\n   ', 'paragraph');
      expect(chunks).toHaveLength(0);
    });

    it('handles single paragraph with no breaks', () => {
      const chunks = chunkText('Just one paragraph.', 'paragraph');
      expect(chunks).toHaveLength(1);
      expect(chunks[0].text).toBe('Just one paragraph.');
    });
  });
});
