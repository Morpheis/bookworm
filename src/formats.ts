import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import AdmZip from 'adm-zip';

/**
 * Extract plain text from a file, detecting format by extension.
 */
export async function extractText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.txt':
      return fs.readFileSync(filePath, 'utf-8');
    case '.epub':
      return extractEpub(filePath);
    case '.pdf':
      return extractPdf(filePath);
    case '.html':
    case '.htm':
      return extractHtml(fs.readFileSync(filePath, 'utf-8'));
    case '.md':
      return extractMarkdown(fs.readFileSync(filePath, 'utf-8'));
    case '.rtf':
      return extractRtf(fs.readFileSync(filePath, 'utf-8'));
    default:
      throw new Error(`Unsupported file format: ${ext}`);
  }
}

/**
 * Extract text from EPUB by reading spine-ordered HTML content.
 */
export function extractEpub(filePath: string): string {
  const zip = new AdmZip(filePath);
  const entries = zip.getEntries();

  // Find content.opf (the package document)
  const opfEntry = entries.find(
    (e) => e.entryName.endsWith('.opf') || e.entryName.includes('content.opf'),
  );

  if (!opfEntry) {
    throw new Error('Invalid EPUB: no .opf package document found');
  }

  const opfContent = opfEntry.getData().toString('utf-8');
  const opfDir = path.dirname(opfEntry.entryName);

  // Parse spine order from OPF
  const spineHrefs = parseSpineOrder(opfContent, opfDir);

  // Read and join content files in spine order
  const texts: string[] = [];
  for (const href of spineHrefs) {
    const entry = entries.find((e) => e.entryName === href);
    if (entry) {
      const html = entry.getData().toString('utf-8');
      const text = stripHtmlTags(html);
      if (text.trim()) {
        texts.push(text.trim());
      }
    }
  }

  if (texts.length === 0) {
    throw new Error('No readable content found in EPUB');
  }

  return texts.join('\n\n');
}

/**
 * Parse the OPF manifest + spine to get ordered content file paths.
 */
export function parseSpineOrder(opfXml: string, opfDir: string): string[] {
  // Extract manifest items: id → href mapping
  const manifest = new Map<string, string>();
  const itemRegex = /<item\s[^>]*?id=["']([^"']+)["'][^>]*?href=["']([^"']+)["'][^>]*?\/?>/g;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(opfXml)) !== null) {
    manifest.set(match[1], match[2]);
  }

  // Also handle reversed attribute order (href before id)
  const itemRegex2 = /<item\s[^>]*?href=["']([^"']+)["'][^>]*?id=["']([^"']+)["'][^>]*?\/?>/g;
  while ((match = itemRegex2.exec(opfXml)) !== null) {
    if (!manifest.has(match[2])) {
      manifest.set(match[2], match[1]);
    }
  }

  // Extract spine itemrefs in order
  const spineMatch = opfXml.match(/<spine[^>]*>([\s\S]*?)<\/spine>/);
  if (!spineMatch) return [];

  const spineContent = spineMatch[1];
  const itemrefRegex = /<itemref\s[^>]*?idref=["']([^"']+)["'][^>]*?\/?>/g;
  const orderedHrefs: string[] = [];

  while ((match = itemrefRegex.exec(spineContent)) !== null) {
    const idref = match[1];
    const href = manifest.get(idref);
    if (href) {
      // Resolve relative to OPF directory
      const fullPath = opfDir && opfDir !== '.' ? `${opfDir}/${href}` : href;
      orderedHrefs.push(fullPath);
    }
  }

  return orderedHrefs;
}

/**
 * Extract text from PDF using pdftotext (poppler).
 */
export function extractPdf(filePath: string): string {
  const pdftotextPath = '/opt/homebrew/bin/pdftotext';

  try {
    fs.accessSync(pdftotextPath, fs.constants.X_OK);
  } catch {
    throw new Error(
      'pdftotext not found. Install poppler: brew install poppler',
    );
  }

  try {
    const output = execSync(`"${pdftotextPath}" "${filePath}" -`, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024, // 50MB
    });
    return output;
  } catch (err) {
    throw new Error(
      `Failed to extract PDF text: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Strip HTML tags, preserving paragraph structure.
 */
export function stripHtmlTags(html: string): string {
  return (
    html
      // Remove everything inside <head>, <script>, <style>
      .replace(/<head(?:\s[^>]*)?>[\s\S]*?<\/head>/gi, '')
      .replace(/<script(?:\s[^>]*)?>[\s\S]*?<\/script>/gi, '')
      .replace(/<style(?:\s[^>]*)?>[\s\S]*?<\/style>/gi, '')
      // Block-level elements get paragraph breaks
      .replace(/<\/?(p|div|h[1-6]|blockquote|li|tr|section|article)(?:\s[^>]*)?>/gi, '\n\n')
      // br tags get single line break
      .replace(/<br\s*\/?>/gi, '\n')
      // Strip remaining tags
      .replace(/<[^>]+>/g, '')
      // Decode common HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
      // Collapse whitespace within lines
      .replace(/[ \t]+/g, ' ')
      // Collapse excessive newlines
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

/**
 * Extract text from HTML files.
 */
export function extractHtml(html: string): string {
  return stripHtmlTags(html);
}

/**
 * Strip markdown syntax, preserving paragraph structure.
 */
export function extractMarkdown(md: string): string {
  return (
    md
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      // Remove images
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      // Convert links to just text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove headers (keep text)
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold/italic markers
      .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/___([^_]+)___/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      // Remove strikethrough
      .replace(/~~([^~]+)~~/g, '$1')
      // Remove horizontal rules
      .replace(/^[-*_]{3,}\s*$/gm, '')
      // Clean up list markers
      .replace(/^[\s]*[-*+]\s+/gm, '')
      .replace(/^[\s]*\d+\.\s+/gm, '')
      // Remove blockquote markers
      .replace(/^>\s?/gm, '')
      // Collapse excessive newlines
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

/**
 * Basic RTF text extraction — strips RTF control words and groups.
 */
export function extractRtf(rtf: string): string {
  // Remove RTF header/font table/color table/stylesheet groups
  let text = rtf
    .replace(/\{\\fonttbl[^}]*\}/g, '')
    .replace(/\{\\colortbl[^}]*\}/g, '')
    .replace(/\{\\stylesheet[^}]*\}/g, '')
    .replace(/\{\\info[\s\S]*?\}/g, '')
    .replace(/\{\\header[\s\S]*?\}/g, '')
    .replace(/\{\\footer[\s\S]*?\}/g, '');

  // Handle paragraph breaks
  text = text.replace(/\\par\b/g, '\n\n');
  text = text.replace(/\\line\b/g, '\n');
  text = text.replace(/\\tab\b/g, '\t');

  // Handle special characters
  text = text.replace(/\\emdash\b/g, '—');
  text = text.replace(/\\endash\b/g, '–');
  text = text.replace(/\\lquote\b/g, '\u2018');
  text = text.replace(/\\rquote\b/g, '\u2019');
  text = text.replace(/\\ldblquote\b/g, '\u201C');
  text = text.replace(/\\rdblquote\b/g, '\u201D');
  text = text.replace(/\\bullet\b/g, '\u2022');

  // Handle unicode escapes: \uN?
  text = text.replace(/\\u(\d+)\??/g, (_, code) => String.fromCharCode(parseInt(code, 10)));

  // Handle hex escapes: \'XX
  text = text.replace(/\\'([0-9a-fA-F]{2})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );

  // Strip remaining RTF control words (\word or \word123)
  text = text.replace(/\\[a-z]+\d*\s?/gi, '');

  // Strip curly braces
  text = text.replace(/[{}]/g, '');

  // Collapse whitespace
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}
