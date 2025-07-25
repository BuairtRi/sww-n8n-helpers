// tests/text.test.js
const {
  cleanHtml,
  truncateWithSeparator,
  basicSanitizeForSQL,
  stripMarkdown,
  countWords,
  extractSentences,
  generateExcerpt,
  normalizeText
} = require('../index');

describe('Text Processing Utilities', () => {
  describe('cleanHtml', () => {
    test('should remove HTML tags and return clean text', () => {
      const html = '<p>Hello <strong>world</strong>!</p>';
      const result = cleanHtml(html);
      expect(result).toBe('Hello world!');
    });

    test('should remove script and style tags by default', () => {
      const html = '<p>Content</p><script>alert("xss")</script><style>body{color:red}</style>';
      const result = cleanHtml(html);
      expect(result).toBe('Content');
    });

    test('should remove custom elements when specified', () => {
      const html = '<p>Keep this</p><div>Remove this</div><span>Keep this too</span>';
      const result = cleanHtml(html, { removeElements: ['div'] });
      expect(result).toBe('Keep thisKeep this too');
    });

    test('should normalize whitespace by default', () => {
      const html = '<p>Multiple   \n\n   spaces</p>';
      const result = cleanHtml(html);
      expect(result).toBe('Multiple spaces');
    });

    test('should preserve whitespace when normalizeWhitespace is false', () => {
      const html = '<p>Multiple   \n\n   spaces</p>';
      const result = cleanHtml(html, { normalizeWhitespace: false });
      expect(result).toContain('   ');
      expect(result).toContain('\n');
    });

    test('should return null for empty or null input', () => {
      expect(cleanHtml('')).toBe(null);
      expect(cleanHtml(null)).toBe(null);
      expect(cleanHtml(undefined)).toBe(null);
    });

    test('should handle complex nested HTML', () => {
      const html = `
        <article>
          <h1>Title</h1>
          <p>Paragraph with <a href="#">link</a> and <em>emphasis</em>.</p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </article>
      `;
      const result = cleanHtml(html);
      expect(result).toContain('Title');
      expect(result).toContain('Paragraph with link and emphasis.');
      expect(result).toContain('Item 1');
      expect(result).toContain('Item 2');
    });
  });

  describe('truncateWithSeparator', () => {
    test('should truncate text at word boundaries', () => {
      const text = 'This is a long sentence that needs to be truncated';
      const result = truncateWithSeparator(text, 20);
      expect(result.length).toBeLessThanOrEqual(23); // 20 + '...'
      expect(result).toMatch(/\.\.\.$|[^\.]$/);
    });

    test('should not truncate if text is shorter than maxLength', () => {
      const text = 'Short text';
      const result = truncateWithSeparator(text, 50);
      expect(result).toBe('Short text');
    });

    test('should use custom separator', () => {
      const text = 'word1|word2|word3|word4';
      const result = truncateWithSeparator(text, 15, { separator: '|' });
      expect(result).not.toContain('word4');
    });

    test('should use custom omission', () => {
      const text = 'This is a long sentence';
      const result = truncateWithSeparator(text, 10, { omission: '>>>' });
      expect(result).toContain('>>>');
    });

    test('should handle empty or null input', () => {
      expect(truncateWithSeparator('', 10)).toBe('');
      expect(truncateWithSeparator(null, 10)).toBe('');
      expect(truncateWithSeparator(undefined, 10)).toBe('');
    });
  });

  describe('basicSanitizeForSQL', () => {
    test('should escape single quotes', () => {
      const text = "It's a test";
      const result = basicSanitizeForSQL(text);
      expect(result).toBe("It''s a test");
    });

    test('should escape backslashes', () => {
      const text = 'Path\\to\\file';
      const result = basicSanitizeForSQL(text);
      expect(result).toBe('Path\\\\to\\\\file');
    });

    test('should remove null characters', () => {
      const text = 'Text\0with\0nulls';
      const result = basicSanitizeForSQL(text);
      expect(result).toBe('Textwithnulls');
    });

    test('should trim whitespace', () => {
      const text = '  spaced text  ';
      const result = basicSanitizeForSQL(text);
      expect(result).toBe('spaced text');
    });

    test('should return null for empty input', () => {
      expect(basicSanitizeForSQL('')).toBe(null);
      expect(basicSanitizeForSQL(null)).toBe(null);
      expect(basicSanitizeForSQL(undefined)).toBe(null);
    });

    test('should handle complex SQL injection attempts', () => {
      const text = "'; DROP TABLE users; --";
      const result = basicSanitizeForSQL(text);
      expect(result).toBe("''; DROP TABLE users; --");
    });
  });

  describe('stripMarkdown', () => {
    test('should remove headers', () => {
      const markdown = '# Header 1\n## Header 2\nNormal text';
      const result = stripMarkdown(markdown);
      expect(result).toBe('Header 1 Header 2 Normal text');
    });

    test('should remove bold and italic formatting', () => {
      const markdown = '**bold text** and *italic text* and __bold__ and _italic_';
      const result = stripMarkdown(markdown);
      expect(result).toBe('bold text and italic text and bold and italic');
    });

    test('should remove links but preserve text', () => {
      const markdown = '[Link text](https://example.com) and ![Alt text](image.jpg)';
      const result = stripMarkdown(markdown);
      expect(result).toBe('Link text and !Alt text');
    });

    test('should remove code blocks and inline code', () => {
      const markdown = '```javascript\nconst x = 1;\n```\nand `inline code`';
      const result = stripMarkdown(markdown);
      expect(result).toBe('and inline code');
    });

    test('should preserve line breaks when option is set', () => {
      const markdown = 'Line 1\n\nLine 2\n\nLine 3';
      const result = stripMarkdown(markdown, { preserveLineBreaks: true });
      expect(result).toContain('\n');
    });

    test('should normalize whitespace by default', () => {
      const markdown = 'Text   with    multiple     spaces';
      const result = stripMarkdown(markdown);
      expect(result).toBe('Text with multiple spaces');
    });

    test('should return null for empty input', () => {
      expect(stripMarkdown('')).toBe(null);
      expect(stripMarkdown(null)).toBe(null);
      expect(stripMarkdown(undefined)).toBe(null);
    });
  });

  describe('countWords', () => {
    test('should count words correctly', () => {
      expect(countWords('Hello world')).toBe(2);
      expect(countWords('One two three four five')).toBe(5);
    });

    test('should handle multiple spaces', () => {
      expect(countWords('Word1   Word2     Word3')).toBe(3);
    });

    test('should exclude numbers when option is set', () => {
      const text = 'There are 123 items and 456 more';
      expect(countWords(text)).toBe(7);
      expect(countWords(text, { excludeNumbers: true })).toBe(5);
    });

    test('should handle empty or null input', () => {
      expect(countWords('')).toBe(0);
      expect(countWords(null)).toBe(0);
      expect(countWords(undefined)).toBe(0);
    });

    test('should handle text with only whitespace', () => {
      expect(countWords('   \n\t   ')).toBe(0);
    });

    test('should handle punctuation correctly', () => {
      expect(countWords('Hello, world! How are you?')).toBe(5);
    });
  });

  describe('extractSentences', () => {
    test('should split text into sentences', () => {
      const text = 'First sentence. Second sentence! Third sentence?';
      const result = extractSentences(text);
      expect(result).toHaveLength(3);
      expect(result[0]).toBe('First sentence');
      expect(result[1]).toBe('Second sentence');
      expect(result[2]).toBe('Third sentence');
    });

    test('should filter out short sentences', () => {
      const text = 'Long enough sentence. Short. Another long enough sentence.';
      const result = extractSentences(text, { minLength: 15 });
      expect(result).toHaveLength(2);
      expect(result[0]).toBe('Long enough sentence');
      expect(result[1]).toBe('Another long enough sentence');
    });

    test('should handle text without sentence endings', () => {
      const text = 'Just some text without proper endings';
      const result = extractSentences(text);
      expect(result).toHaveLength(1);
    });

    test('should return empty array for empty input', () => {
      expect(extractSentences('')).toEqual([]);
      expect(extractSentences(null)).toEqual([]);
      expect(extractSentences(undefined)).toEqual([]);
    });
  });

  describe('generateExcerpt', () => {
    test('should return full text if shorter than maxLength', () => {
      const text = 'Short text';
      const result = generateExcerpt(text, 50);
      expect(result).toBe('Short text');
    });

    test('should generate excerpt with complete sentences', () => {
      const text = 'First sentence. Second sentence. Third sentence. Fourth sentence.';
      const result = generateExcerpt(text, 30);
      expect(result).toBe('First sentence.');
    });

    test('should fallback to truncation if no complete sentences fit', () => {
      const text = 'This is a very long sentence that exceeds the maximum length limit.';
      const result = generateExcerpt(text, 20);
      expect(result.length).toBeLessThanOrEqual(23); // 20 + '...'
    });

    test('should truncate without sentence completion when option is false', () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const result = generateExcerpt(text, 20, { completeSentences: false });
      expect(result.length).toBeLessThanOrEqual(23); // 20 + '...'
    });

    test('should return null for empty input', () => {
      expect(generateExcerpt('')).toBe(null);
      expect(generateExcerpt(null)).toBe(null);
      expect(generateExcerpt(undefined)).toBe(null);
    });
  });

  describe('normalizeText', () => {
    test('should normalize quotes', () => {
      const text = '"Hello" and \'world\' with "quotes"';
      const result = normalizeText(text);
      expect(result).toBe('"Hello" and \'world\' with "quotes"');
    });

    test('should remove extra spaces', () => {
      const text = 'Text   with    extra     spaces';
      const result = normalizeText(text);
      expect(result).toBe('Text with extra spaces');
    });

    test('should preserve spaces when option is false', () => {
      const text = 'Text   with    spaces';
      const result = normalizeText(text, { removeExtraSpaces: false });
      expect(result).toContain('   ');
    });

    test('should preserve quotes when option is false', () => {
      const text = '"Hello" and \'world\'';
      const result = normalizeText(text, { normalizeQuotes: false });
      expect(result).toContain('"');
      expect(result).toContain('\'');
    });

    test('should trim whitespace', () => {
      const text = '  Text with padding  ';
      const result = normalizeText(text);
      expect(result).toBe('Text with padding');
    });

    test('should return null for empty input', () => {
      expect(normalizeText('')).toBe(null);
      expect(normalizeText(null)).toBe(null);
      expect(normalizeText(undefined)).toBe(null);
    });

    test('should handle text with only whitespace', () => {
      expect(normalizeText('   \n\t   ')).toBe(null);
    });
  });
}); 