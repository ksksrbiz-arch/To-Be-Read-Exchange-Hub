const { validateFileMagicNumber, sanitizeCSVContent, detectSQLInjection } = require('../src/utils/security');

describe('Security Utilities', () => {
  describe('validateFileMagicNumber', () => {
    it('should validate JPEG magic number', () => {
      const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]);
      expect(validateFileMagicNumber(jpegBuffer, 'image/jpeg')).toBe(true);
    });

    it('should validate PNG magic number', () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      expect(validateFileMagicNumber(pngBuffer, 'image/png')).toBe(true);
    });

    it('should reject mismatched file type', () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      expect(validateFileMagicNumber(pngBuffer, 'image/jpeg')).toBe(false);
    });

    it('should validate CSV as text file', () => {
      const csvBuffer = Buffer.from('isbn,title,author\n9780123456789,Book,Author');
      expect(validateFileMagicNumber(csvBuffer, 'text/csv')).toBe(true);
    });

    it('should validate JSON as text file', () => {
      const jsonBuffer = Buffer.from('[{"isbn": "9780123456789"}]');
      expect(validateFileMagicNumber(jsonBuffer, 'application/json')).toBe(true);
    });

    it('should reject buffer too small', () => {
      const smallBuffer = Buffer.from([0xFF]);
      expect(validateFileMagicNumber(smallBuffer, 'image/jpeg')).toBe(false);
    });
  });

  describe('sanitizeCSVContent', () => {
    it('should sanitize formula injection attempts', () => {
      const maliciousCSV = 'isbn,title\n=1+1,Innocent Book';
      const sanitized = sanitizeCSVContent(maliciousCSV);
      
      expect(sanitized).toContain("'=1+1");
      expect(sanitized).not.toMatch(/^=1\+1/);
    });

    it('should sanitize multiple dangerous characters', () => {
      const maliciousCSV = `isbn,title
+SUM(1,2),Book1
@IMPORT("url"),Book2
-1,Book3
|cmd,Book4`;
      
      const sanitized = sanitizeCSVContent(maliciousCSV);
      
      expect(sanitized).toContain("'+SUM(1,2)");
      expect(sanitized).toContain("'@IMPORT");
      expect(sanitized).toContain("'-1");
      expect(sanitized).toContain("'|cmd");
    });

    it('should not modify safe content', () => {
      const safeCSV = 'isbn,title,author\n9780123456789,Great Book,John Doe';
      const sanitized = sanitizeCSVContent(safeCSV);
      
      expect(sanitized).toBe(safeCSV);
    });
  });

  describe('detectSQLInjection', () => {
    it('should detect SELECT statement', () => {
      expect(detectSQLInjection('SELECT * FROM users')).toBe(true);
    });

    it('should detect UNION attack', () => {
      expect(detectSQLInjection("' UNION SELECT password FROM users --")).toBe(true);
    });

    it('should detect OR 1=1 pattern', () => {
      expect(detectSQLInjection("admin' OR 1=1 --")).toBe(true);
    });

    it('should detect DROP TABLE', () => {
      expect(detectSQLInjection('Robert\'); DROP TABLE Students;--')).toBe(true);
    });

    it('should allow safe inputs', () => {
      expect(detectSQLInjection('The Great Gatsby')).toBe(false);
      expect(detectSQLInjection('F. Scott Fitzgerald')).toBe(false);
      expect(detectSQLInjection('9780123456789')).toBe(false);
    });

    it('should handle non-string inputs', () => {
      expect(detectSQLInjection(123)).toBe(false);
      expect(detectSQLInjection(null)).toBe(false);
      expect(detectSQLInjection(undefined)).toBe(false);
    });
  });
});
