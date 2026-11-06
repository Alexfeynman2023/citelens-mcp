import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IndexNowClient } from './indexnow-client.js';

describe('IndexNowClient', () => {
  describe('generateKey', () => {
    it('should generate a key of specified length', () => {
      const key = IndexNowClient.generateKey(32);
      expect(key).toHaveLength(32);
    });

    it('should generate key with valid characters only', () => {
      const key = IndexNowClient.generateKey(100);
      expect(key).toMatch(/^[a-zA-Z0-9-]+$/);
    });

    it('should throw for length < 8', () => {
      expect(() => IndexNowClient.generateKey(7)).toThrow('between 8 and 128');
    });

    it('should throw for length > 128', () => {
      expect(() => IndexNowClient.generateKey(129)).toThrow('between 8 and 128');
    });

    it('should generate unique keys', () => {
      const keys = new Set<string>();
      for (let i = 0; i < 100; i++) {
        keys.add(IndexNowClient.generateKey(32));
      }
      expect(keys.size).toBe(100);
    });
  });

  describe('validateKeyFile', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should return valid when key file matches', async () => {
      const key = 'test-key-12345';
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        text: async () => key,
      });

      const client = new IndexNowClient(key);
      const result = await client.validateKeyFile('example.com');

      expect(result.valid).toBe(true);
      expect(result.message).toContain('valid and accessible');
      expect(global.fetch).toHaveBeenCalledWith(
        `https://example.com/${key}.txt`,
        expect.any(Object)
      );
    });

    it('should return invalid when key file not found', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 404,
      });

      const client = new IndexNowClient('test-key');
      const result = await client.validateKeyFile('example.com');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('not accessible');
    });

    it('should return invalid when key content does not match', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        text: async () => 'wrong-key',
      });

      const client = new IndexNowClient('test-key');
      const result = await client.validateKeyFile('example.com');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('does not match');
    });

    it('should return invalid when no key provided', async () => {
      const client = new IndexNowClient();
      const result = await client.validateKeyFile('example.com');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('No IndexNow key provided');
    });
  });

  describe('submitUrl', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should submit URL successfully', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 200,
      });

      const client = new IndexNowClient('test-key');
      const result = await client.submitUrl('https://example.com/page');

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('url=https%3A%2F%2Fexample.com%2Fpage'),
        expect.any(Object)
      );
    });

    it('should handle 202 (pending validation)', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 202,
      });

      const client = new IndexNowClient('test-key');
      const result = await client.submitUrl('https://example.com/page');

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(202);
      expect(result.message).toContain('pending');
    });

    it('should handle 403 (invalid key)', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 403,
      });

      const client = new IndexNowClient('invalid-key');
      const result = await client.submitUrl('https://example.com/page');

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(403);
      expect(result.message).toContain('Invalid key');
    });

    it('should handle 429 (rate limit)', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 429,
      });

      const client = new IndexNowClient('test-key');
      const result = await client.submitUrl('https://example.com/page');

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(429);
      expect(result.message).toContain('Too many requests');
    });

    it('should return error when no key provided', async () => {
      const client = new IndexNowClient();
      const result = await client.submitUrl('https://example.com/page');

      expect(result.success).toBe(false);
      expect(result.message).toContain('No IndexNow key provided');
    });
  });

  describe('submitUrlBatch', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should submit batch successfully', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 200,
      });

      const client = new IndexNowClient('test-key');
      const urls = [
        'https://example.com/page1',
        'https://example.com/page2',
      ];
      const result = await client.submitUrlBatch('example.com', urls);

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"urlList"'),
        })
      );
    });

    it('should reject empty URL list', async () => {
      const client = new IndexNowClient('test-key');
      const result = await client.submitUrlBatch('example.com', []);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No URLs provided');
    });

    it('should reject more than 10000 URLs', async () => {
      const client = new IndexNowClient('test-key');
      const urls = Array(10001).fill('https://example.com/page');
      const result = await client.submitUrlBatch('example.com', urls);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Maximum 10,000');
    });
  });
});
