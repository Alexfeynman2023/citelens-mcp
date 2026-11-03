import type {
  BingSite,
  BingRankAndTrafficStats,
  BingQueryStats,
  BingPageStats,
  BingCrawlStats,
  BingCrawlIssue,
  BingUrlInfo,
  BingSitemap,
  BingUrlSubmissionQuota,
  BingApiError,
} from './types.js';

const BING_API_BASE = 'https://ssl.bing.com/webmaster/api.svc/json';

export class BingWebmasterClient {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Bing Webmaster API key is required');
    }
    this.apiKey = apiKey;
  }

  private async request<T>(method: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${BING_API_BASE}/${method}`);
    url.searchParams.set('apikey', this.apiKey);
    
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Bing API error: ${response.status} ${response.statusText} - ${text}`);
    }

    const data = await response.json() as { d: T } | BingApiError;
    
    if ('ErrorCode' in data) {
      throw new Error(`Bing API error ${data.ErrorCode}: ${data.Message}`);
    }

    return (data as { d: T }).d;
  }

  private async postRequest<T>(method: string, body: unknown, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${BING_API_BASE}/${method}`);
    url.searchParams.set('apikey', this.apiKey);
    
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Bing API error: ${response.status} ${response.statusText} - ${text}`);
    }

    const data = await response.json() as { d: T } | BingApiError;
    
    if ('ErrorCode' in data) {
      throw new Error(`Bing API error ${data.ErrorCode}: ${data.Message}`);
    }

    return (data as { d: T }).d;
  }

  private parseBingDate(dateStr: string): string {
    const match = /\/Date\((\d+)([+-]\d{4})?\)\//.exec(dateStr);
    if (match) {
      const ms = parseInt(match[1], 10);
      return new Date(ms).toISOString();
    }
    return dateStr;
  }

  async getUserSites(): Promise<BingSite[]> {
    const result = await this.request<BingSite[]>('GetUserSites');
    return result || [];
  }

  async getRankAndTrafficStats(siteUrl: string): Promise<BingRankAndTrafficStats[]> {
    const result = await this.request<BingRankAndTrafficStats[]>('GetRankAndTrafficStats', {
      siteUrl,
    });
    return (result || []).map(stat => ({
      ...stat,
      Date: this.parseBingDate(stat.Date),
    }));
  }

  async getQueryStats(siteUrl: string): Promise<BingQueryStats[]> {
    const result = await this.request<BingQueryStats[]>('GetQueryStats', {
      siteUrl,
    });
    return result || [];
  }

  async getPageStats(siteUrl: string): Promise<BingPageStats[]> {
    const result = await this.request<BingPageStats[]>('GetPageStats', {
      siteUrl,
    });
    return result || [];
  }

  async getCrawlStats(siteUrl: string): Promise<BingCrawlStats[]> {
    const result = await this.request<BingCrawlStats[]>('GetCrawlStats', {
      siteUrl,
    });
    return (result || []).map(stat => ({
      ...stat,
      Date: this.parseBingDate(stat.Date),
    }));
  }

  async getCrawlIssues(siteUrl: string): Promise<BingCrawlIssue[]> {
    const result = await this.request<BingCrawlIssue[]>('GetCrawlIssues', {
      siteUrl,
    });
    return (result || []).map(issue => ({
      ...issue,
      Date: this.parseBingDate(issue.Date),
    }));
  }

  async getUrlInfo(siteUrl: string, url: string): Promise<BingUrlInfo> {
    const result = await this.request<BingUrlInfo>('GetUrlInfo', {
      siteUrl,
      url,
    });
    return {
      ...result,
      LastCrawledDate: result.LastCrawledDate ? this.parseBingDate(result.LastCrawledDate) : null,
      DiscoveryDate: result.DiscoveryDate ? this.parseBingDate(result.DiscoveryDate) : null,
    };
  }

  async getFeeds(siteUrl: string): Promise<BingSitemap[]> {
    const result = await this.request<BingSitemap[]>('GetFeeds', {
      siteUrl,
    });
    return (result || []).map(feed => ({
      ...feed,
      LastSubmitted: this.parseBingDate(feed.LastSubmitted),
      LastDownload: feed.LastDownload ? this.parseBingDate(feed.LastDownload) : null,
    }));
  }

  async submitFeed(siteUrl: string, feedUrl: string): Promise<void> {
    await this.request<void>('SubmitFeed', {
      siteUrl,
      feedUrl,
    });
  }

  async getUrlSubmissionQuota(siteUrl: string): Promise<BingUrlSubmissionQuota> {
    const result = await this.request<BingUrlSubmissionQuota>('GetUrlSubmissionQuota', {
      siteUrl,
    });
    return result;
  }

  async submitUrl(siteUrl: string, url: string): Promise<void> {
    await this.postRequest<void>('SubmitUrl', {
      siteUrl,
      url,
    });
  }

  async submitUrlBatch(siteUrl: string, urls: string[]): Promise<void> {
    if (urls.length > 500) {
      throw new Error('Maximum 500 URLs per batch submission');
    }
    await this.postRequest<void>('SubmitUrlBatch', {
      siteUrl,
      urlList: urls,
    });
  }
}
