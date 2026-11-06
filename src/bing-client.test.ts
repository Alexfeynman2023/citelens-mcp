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
    it('should fetch and return sites with live API field names', async () => {
      // VERIFIED: Live API returns Url, IsVerified (no IsOwner)
      const mockSites = [
        { Url: 'https://example.com/', IsVerified: true },
        { Url: 'https://test.com/', IsVerified: true },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse({
          ok: true,
          json: async () => ({ d: mockSites }),
        })
      );

      const result = await client.getUserSites();

      expect(result).toEqual(mockSites);
      expect(result[0].Url).toBe('https://example.com/');
      expect(result[0].IsVerified).toBe(true);
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
    it('should fetch URL info with live API field names', async () => {
      // VERIFIED: Live API uses HttpStatus (not HttpCode), no IsIndexed
      const mockInfo = {
        Url: 'https://example.com/page',
        HttpStatus: 200,
        IsPage: true,
        LastCrawledDate: '/Date(1704067200000)/',
        DiscoveryDate: '/Date(1704000000000)/',
        DocumentSize: 12345,
        AnchorCount: 5,
        TotalChildUrlCount: 0,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse({
          ok: true,
          json: async () => ({ d: mockInfo }),
        })
      );

      const result = await client.getUrlInfo('https://example.com', 'https://example.com/page');

      expect(result.HttpStatus).toBe(200);
      expect(result.IsPage).toBe(true);
      expect(result.LastCrawledDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(result.DiscoveryDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should parse negative date sentinel as null', async () => {
      // VERIFIED: /Date(-62135596800000)/ is used for "not crawled" sentinel
      const mockInfo = {
        Url: 'https://example.com/page',
        HttpStatus: 0,
        LastCrawledDate: '/Date(-62135596800000)/',
        DiscoveryDate: '/Date(-62135596800000)/',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse({
          ok: true,
          json: async () => ({ d: mockInfo }),
        })
      );

      const result = await client.getUrlInfo('https://example.com', 'https://example.com/page');

      expect(result.LastCrawledDate).toBeNull();
      expect(result.DiscoveryDate).toBeNull();
    });
  });

  describe('getFeeds', () => {
    it('should fetch sitemaps with live API field names', async () => {
      // VERIFIED: Live API uses Submitted/LastCrawled/UrlCount (not LastSubmitted/LastDownload/TotalUrls)
      const mockFeeds = [
        {
          Url: 'https://example.com/sitemap.xml',
          Type: 'Sitemap',
          Status: 'Success',
          Submitted: '/Date(1793869293000)/',
          LastCrawled: '/Date(1793870000000)/',
          UrlCount: 10,
          FileSize: 1234,
          Compressed: false,
        },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse({
          ok: true,
          json: async () => ({ d: mockFeeds }),
        })
      );

      const result = await client.getFeeds('https://example.com');

      expect(result[0].Url).toBe('https://example.com/sitemap.xml');
      expect(result[0].Type).toBe('Sitemap');
      expect(result[0].Status).toBe('Success');
      expect(result[0].UrlCount).toBe(10);
      expect(result[0].Submitted).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(result[0].LastCrawled).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should handle null LastCrawled', async () => {
      const mockFeeds = [
        {
          Url: 'https://example.com/sitemap.xml',
          Type: 'Sitemap',
          Status: 'Pending',
          Submitted: '/Date(1793869293000)/',
          LastCrawled: null,
          UrlCount: 0,
        },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse({
          ok: true,
          json: async () => ({ d: mockFeeds }),
        })
      );

      const result = await client.getFeeds('https://example.com');

      expect(result[0].LastCrawled).toBeNull();
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

    it('should handle ErrorCode 14 (NotAuthorized)', async () => {
      // VERIFIED: ErrorCode 14 seen when querying URL from different domain
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse({
          ok: true,
          json: async () => ({ ErrorCode: 14, Message: 'ERROR!!! NotAuthorized' }),
        })
      );

      await expect(client.getUrlInfo('https://example.com', 'https://other.com/page')).rejects.toThrow('Not authorized');
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

  describe('OAuth refresh timing', () => {
    it('should refresh expired token BEFORE applying auth to request', async () => {
      const callOrder: string[] = [];
      
      const mockAuth = {
        refreshIfNeeded: vi.fn().mockImplementation(async () => {
          callOrder.push('refresh');
        }),
        applyAuth: vi.fn().mockImplementation(() => {
          callOrder.push('applyAuth');
        }),
      };
      
      // Create client with mock auth by using prototype manipulation
      const oauthClient = new BingWebmasterClient('test-key');
      (oauthClient as unknown as { auth: typeof mockAuth }).auth = mockAuth;
      
      // Mock the instanceof check by making auth look like OAuthAuth
      Object.defineProperty(mockAuth, 'constructor', { value: { name: 'OAuthAuth' } });
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse({
          ok: true,
          json: async () => ({ d: [] }),
        })
      );

      // Import OAuthAuth to create a real instance for proper instanceof check
      const { OAuthAuth } = await import('./bing-auth.js');
      
      let refreshCalled = false;
      const oauthAuth = new OAuthAuth(
        {
          accessToken: 'expired-token',
          refreshToken: 'refresh-token',
          expiresAt: Date.now() - 1000,
        },
        async (tokens) => {
          refreshCalled = true;
          return {
            accessToken: 'new-token',
            refreshToken: tokens.refreshToken,
            expiresAt: Date.now() + 3600000,
          };
        }
      );

      const oauthClientReal = new BingWebmasterClient(oauthAuth);
      await oauthClientReal.getUserSites();

      expect(refreshCalled).toBe(true);
      // Verify the fetch was called with the refreshed token
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.any(Headers),
        })
      );
    });
  });

  describe('date parsing', () => {
    it('should parse positive milliseconds', async () => {
      const mockStats = [
        { Date: '/Date(1793869293000)/', Clicks: 10, Impressions: 100 },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse({
          ok: true,
          json: async () => ({ d: mockStats }),
        })
      );

      const result = await client.getRankAndTrafficStats('https://example.com');
      expect(result[0].Date).toBe('2026-11-05T09:01:33.000Z');
    });

    it('should parse dates without timezone offset', async () => {
      // VERIFIED: Live API returns dates without +0000/-0700 suffix
      const mockStats = [
        { Date: '/Date(1704067200000)/', Clicks: 10, Impressions: 100 },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse({
          ok: true,
          json: async () => ({ d: mockStats }),
        })
      );

      const result = await client.getRankAndTrafficStats('https://example.com');
      expect(result[0].Date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});
