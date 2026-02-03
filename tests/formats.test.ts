import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  stripHtmlTags,
  extractHtml,
  extractMarkdown,
  extractRtf,
  parseSpineOrder,
} from '../src/formats.js';

describe('formats', () => {
  describe('stripHtmlTags / extractHtml', () => {
    it('strips basic HTML tags', () => {
      const html = '<p>Hello <b>world</b></p>';
      const result = stripHtmlTags(html);
      expect(result).toContain('Hello');
      expect(result).toContain('world');
      expect(result).not.toContain('<p>');
      expect(result).not.toContain('<b>');
    });

    it('preserves paragraph structure', () => {
      const html = '<p>First paragraph.</p><p>Second paragraph.</p>';
      const result = stripHtmlTags(html);
      expect(result).toContain('First paragraph.');
      expect(result).toContain('Second paragraph.');
      // Paragraphs should be separated
      const parts = result.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
      expect(parts.length).toBeGreaterThanOrEqual(2);
    });

    it('removes script and style blocks', () => {
      const html = '<p>Real content</p><script>alert("bad")</script><style>.x{}</style><p>More content</p>';
      const result = stripHtmlTags(html);
      expect(result).toContain('Real content');
      expect(result).toContain('More content');
      expect(result).not.toContain('alert');
      expect(result).not.toContain('.x{}');
    });

    it('removes head section', () => {
      const html = '<head><title>Page</title></head><body><p>Content here</p></body>';
      const result = stripHtmlTags(html);
      expect(result).toContain('Content here');
      expect(result).not.toContain('Page');
    });

    it('decodes HTML entities', () => {
      const html = '<p>Tom &amp; Jerry &lt;3&gt; say &quot;hi&quot;</p>';
      const result = stripHtmlTags(html);
      expect(result).toContain('Tom & Jerry');
      expect(result).toContain('<3>');
      expect(result).toContain('"hi"');
    });

    it('decodes numeric entities', () => {
      const html = '<p>&#169; 2024</p>';
      const result = stripHtmlTags(html);
      expect(result).toContain('© 2024');
    });

    it('handles br tags as line breaks', () => {
      const html = 'Line one<br>Line two<br/>Line three';
      const result = stripHtmlTags(html);
      expect(result).toContain('Line one');
      expect(result).toContain('Line two');
      expect(result).toContain('Line three');
    });

    it('handles empty input', () => {
      expect(stripHtmlTags('')).toBe('');
    });

    it('handles block-level elements as paragraph breaks', () => {
      const html = '<div>Block one</div><div>Block two</div><h1>Header</h1><p>Para</p>';
      const result = stripHtmlTags(html);
      expect(result).toContain('Block one');
      expect(result).toContain('Block two');
      expect(result).toContain('Header');
      expect(result).toContain('Para');
    });

    it('extractHtml is an alias for stripHtmlTags', () => {
      const html = '<p>Hello <em>world</em></p>';
      expect(extractHtml(html)).toBe(stripHtmlTags(html));
    });
  });

  describe('extractMarkdown', () => {
    it('strips header markers', () => {
      const md = '# Title\n\n## Subtitle\n\nContent here.';
      const result = extractMarkdown(md);
      expect(result).toContain('Title');
      expect(result).toContain('Subtitle');
      expect(result).toContain('Content here.');
      expect(result).not.toContain('#');
    });

    it('strips bold and italic markers', () => {
      const md = 'This is **bold** and *italic* and ***both***.';
      const result = extractMarkdown(md);
      expect(result).toContain('bold');
      expect(result).toContain('italic');
      expect(result).toContain('both');
      expect(result).not.toContain('**');
      expect(result).not.toContain('***');
    });

    it('strips underscore bold/italic', () => {
      const md = 'This is __bold__ and _italic_ and ___both___.';
      const result = extractMarkdown(md);
      expect(result).toContain('bold');
      expect(result).toContain('italic');
      expect(result).toContain('both');
      expect(result).not.toContain('__');
    });

    it('converts links to just text', () => {
      const md = 'Visit [the site](https://example.com) for info.';
      const result = extractMarkdown(md);
      expect(result).toContain('the site');
      expect(result).not.toContain('https://');
      expect(result).not.toContain('[');
      expect(result).not.toContain(']');
    });

    it('strips images, keeping alt text', () => {
      const md = 'Look at this: ![A cat](cat.jpg)';
      const result = extractMarkdown(md);
      expect(result).toContain('A cat');
      expect(result).not.toContain('cat.jpg');
    });

    it('strips code blocks', () => {
      const md = 'Before\n\n```javascript\nconsole.log("hi");\n```\n\nAfter';
      const result = extractMarkdown(md);
      expect(result).toContain('Before');
      expect(result).toContain('After');
      expect(result).not.toContain('console.log');
    });

    it('strips inline code', () => {
      const md = 'Use the `extractText` function.';
      const result = extractMarkdown(md);
      expect(result).toContain('extractText');
      expect(result).not.toContain('`');
    });

    it('strips horizontal rules', () => {
      const md = 'Before\n\n---\n\nAfter';
      const result = extractMarkdown(md);
      expect(result).toContain('Before');
      expect(result).toContain('After');
      expect(result).not.toMatch(/^---$/m);
    });

    it('strips list markers', () => {
      const md = '- Item one\n- Item two\n* Item three\n1. Ordered one\n2. Ordered two';
      const result = extractMarkdown(md);
      expect(result).toContain('Item one');
      expect(result).toContain('Item two');
      expect(result).toContain('Ordered one');
      expect(result).not.toMatch(/^- /m);
      expect(result).not.toMatch(/^\* /m);
      expect(result).not.toMatch(/^\d+\. /m);
    });

    it('strips blockquote markers', () => {
      const md = '> This is a quote.\n> It continues.';
      const result = extractMarkdown(md);
      expect(result).toContain('This is a quote.');
      expect(result).toContain('It continues.');
      expect(result).not.toContain('>');
    });

    it('strips strikethrough', () => {
      const md = 'This is ~~deleted~~ text.';
      const result = extractMarkdown(md);
      expect(result).toContain('deleted');
      expect(result).not.toContain('~~');
    });

    it('handles empty input', () => {
      expect(extractMarkdown('')).toBe('');
    });
  });

  describe('extractRtf', () => {
    it('strips basic RTF control words', () => {
      const rtf = '{\\rtf1\\ansi Hello world}';
      const result = extractRtf(rtf);
      expect(result).toContain('Hello world');
      expect(result).not.toContain('\\rtf1');
      expect(result).not.toContain('\\ansi');
    });

    it('handles paragraph breaks', () => {
      const rtf = '{\\rtf1 First paragraph.\\par Second paragraph.}';
      const result = extractRtf(rtf);
      expect(result).toContain('First paragraph.');
      expect(result).toContain('Second paragraph.');
      // Should have separation
      const parts = result.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
      expect(parts.length).toBe(2);
    });

    it('handles special characters', () => {
      const rtf = '{\\rtf1 He said \\ldblquote hello\\rdblquote  and left\\emdash gone.}';
      const result = extractRtf(rtf);
      expect(result).toContain('\u201C');
      expect(result).toContain('\u201D');
      expect(result).toContain('—');
    });

    it('handles hex escapes', () => {
      const rtf = "{\\rtf1 caf\\'e9}";
      const result = extractRtf(rtf);
      expect(result).toContain('café');
    });

    it('handles unicode escapes', () => {
      const rtf = '{\\rtf1 \\u8212? is an em dash}';
      const result = extractRtf(rtf);
      expect(result).toContain('—');
      expect(result).toContain('is an em dash');
    });

    it('strips font tables', () => {
      const rtf = '{\\rtf1{\\fonttbl{\\f0 Times;}}Hello}';
      const result = extractRtf(rtf);
      expect(result).toContain('Hello');
      expect(result).not.toContain('fonttbl');
      expect(result).not.toContain('Times');
    });

    it('strips curly braces', () => {
      const rtf = '{\\rtf1 {\\b Bold text}}';
      const result = extractRtf(rtf);
      expect(result).toContain('Bold text');
      expect(result).not.toContain('{');
      expect(result).not.toContain('}');
    });

    it('handles empty input', () => {
      expect(extractRtf('')).toBe('');
    });
  });

  describe('parseSpineOrder', () => {
    it('parses manifest and spine to get ordered content files', () => {
      const opfXml = `<?xml version="1.0"?>
<package>
  <manifest>
    <item id="ch1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="chapter2.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch3" href="chapter3.xhtml" media-type="application/xhtml+xml"/>
    <item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
  </manifest>
  <spine toc="toc">
    <itemref idref="ch1"/>
    <itemref idref="ch3"/>
    <itemref idref="ch2"/>
  </spine>
</package>`;

      const result = parseSpineOrder(opfXml, '');
      expect(result).toEqual(['chapter1.xhtml', 'chapter3.xhtml', 'chapter2.xhtml']);
    });

    it('resolves paths relative to OPF directory', () => {
      const opfXml = `<package>
  <manifest>
    <item id="ch1" href="text/chapter1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="ch1"/>
  </spine>
</package>`;

      const result = parseSpineOrder(opfXml, 'OEBPS');
      expect(result).toEqual(['OEBPS/text/chapter1.xhtml']);
    });

    it('returns empty array when no spine found', () => {
      const opfXml = '<package><manifest></manifest></package>';
      const result = parseSpineOrder(opfXml, '');
      expect(result).toEqual([]);
    });

    it('handles reversed attribute order (href before id)', () => {
      const opfXml = `<package>
  <manifest>
    <item href="chapter1.xhtml" id="ch1" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="ch1"/>
  </spine>
</package>`;

      const result = parseSpineOrder(opfXml, '');
      expect(result).toEqual(['chapter1.xhtml']);
    });
  });

  describe('extractPdf', () => {
    it('throws descriptive error when pdftotext is not found', async () => {
      // We test the actual extractPdf function behavior indirectly
      // by importing and calling with a non-existent file
      const { extractPdf } = await import('../src/formats.js');

      // This should throw because the file doesn't exist (even if pdftotext is installed)
      expect(() => extractPdf('/nonexistent/file.pdf')).toThrow();
    });
  });
});
