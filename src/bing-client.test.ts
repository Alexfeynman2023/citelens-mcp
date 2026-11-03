import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BingWebmasterClient } from './bing-client.js';

function createMockResponse(data: { ok: boolean; status?: number; statusText?: string; json?: () => Promise<unknown>; text?: () => Promise<string> }) {
  return {
    ok: data.ok,
    status: data.status || (data.ok ? 200 : 500),
    statusText: data.statusText || (data.ok ? 'OK' : 'Error'),
    headers: new Headers({ 'content-type': 'application/json' }),
    json: data.json || (async () => ({})),
    text: data.text || (async () => ''),
  };
}

describe('BingWebmasterClient', () => {
  const originalFetch = global.fetch;
  let client: BingWebmasterClient;

  beforeEach(() => {
    global.fetch = vi.fn();
    client = new BingWebmasterClient('test-api-key');
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should throw without API key', () => {
    expect(() => new BingWebmasterClient('')).toThrow('API key is required');
  });

  describe('getUserSites', () => {
    it('should fetch and return sites', async () => {
      const mockSites = [
        { Url: 'https://example.com', IsOwner: true, IsVerified: true },
        { Url: 'https://test.com', IsOwner: false, IsVerified: true },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse({
          ok: true,
          json: async () => ({ d: mockSites }),
        })
      );

      const result = await client.getUserSites();

      expect(result).toEqual(mockSites);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('GetUserSites'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('apikey=test-api-key'),
        expect.any(Object)
      );
    });

    it('should return empty array for null response', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse({
          ok: true,
          json: async () => ({ d: null }),
        })
      );

      const result = await client.getUserSites();
      expect(result).toEqual([]);
    });
  });

  describe('getRankAndTrafficStats', () => {
    it('should fetch traffic stats and parse dates', async () => {
      const mockStats = [
        { Date: '/Date(1704067200000-0700)/', Clicks: 100, Impressions: 1000 },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse({
          ok: true,
          json: async () => ({ d: mockStats }),
        })
      );

      const result = await client.getRankAndTrafficStats('https://example.com');

      expect(result[0].Clicks).toBe(100);
      expect(result[0].Impressions).toBe(1000);
      expect(result[0].Date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('getQueryStats', () => {
    it('should fetch query statistics', async () => {
      const mockStats = [
        { Query: 'test query', Impressions: 500, Clicks: 25, AvgImpressionPosition: 3.5, AvgClickPosition: 2.1 },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse({
          ok: true,
          json: async () => ({ d: mockStats }),
        })
      );

      const result = await client.getQueryStats('https://example.com');

      expect(result).toEqual(mockStats);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('GetQueryStats'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('siteUrl=https%3A%2F%2Fexample.com'),
        expect.any(Object)
      );
    });
  });

  describe('getUrlInfo', () => {
    it('should fetch URL info and parse dates', async () => {
      const mockInfo = {
        Url: 'https://example.com/page',
        IsIndexed: true,
        LastCrawledDate: '/Date(1704067200000)/',
        HttpCode: 200,
        DiscoveryDate: null,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse({
          ok: true,
          json: async () => ({ d: mockInfo }),
        })
      );

      const result = await client.getUrlInfo('https://example.com', 'https://example.com/page');

      expect(result.IsIndexed).toBe(true);
      expect(result.LastCrawledDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(result.DiscoveryDate).toBeNull();
    });
  });

  describe('submitUrlBatch', () => {
    it('should submit URLs via POST', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse({
          ok: true,
          json: async () => ({ d: null }),
        })
      );

      const urls = ['https://example.com/page1', 'https://example.com/page2'];
      await client.submitUrlBatch('https://example.com', urls);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('SubmitUrlBatch'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('urlList'),
        })
      );
    });

    it('should reject more than 500 URLs', async () => {
      const urls = Array(501).fill('https://example.com/page');
      
      await expect(client.submitUrlBatch('https://example.com', urls)).rejects.toThrow(
        'Maximum 500 URLs'
      );
    });
  });

  describe('error handling', () => {
    it('should throw on HTTP error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: async () => ({ ErrorCode: 3, Message: 'ERROR!!! InvalidApiKey' }),
        })
      );

      await expect(client.getUserSites()).rejects.toThrow('Invalid API key');
    });

    it('should throw on API error response', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse({
          ok: true,
          json: async () => ({ ErrorCode: 9, Message: 'ThrottleUser' }),
        })
      );

      await expect(client.getUserSites()).rejects.toThrow('Rate limited');
    });

    it('should format unknown error codes cleanly', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse({
          ok: true,
          json: async () => ({ ErrorCode: 999, Message: 'ERROR!!! SomeNewError' }),
        })
      );

      await expect(client.getUserSites()).rejects.toThrow('SomeNewError (code 999)');
    });
  });
});
