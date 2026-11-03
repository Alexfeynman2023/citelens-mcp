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
import { type BingAuthProvider, ApiKeyAuth, OAuthAuth, type OAuthTokens, type TokenRefreshCallback } from './bing-auth.js';

export { ApiKeyAuth, OAuthAuth, type OAuthTokens, type TokenRefreshCallback, type BingAuthProvider };

const BING_API_BASE = 'https://ssl.bing.com/webmaster/api.svc/json';

const ERROR_MESSAGES: Record<number, string> = {
  1: 'Unknown error',
  2: 'Internal error',
  3: 'Invalid API key - check your BING_WEBMASTER_API_KEY',
  4: 'User not authorized',
  5: 'Invalid URL format',
  6: 'URL not found in your verified sites',
  7: 'Site not verified - verify the site in Bing Webmaster Tools first',
  8: 'Quota exceeded - daily URL submission limit reached',
  9: 'Rate limited (ThrottleUser) - slow down requests',
  10: 'Rate limited (ThrottleHost) - slow down requests',
};

function formatApiError(errorCode: number, message: string): string {
  const friendlyMessage = ERROR_MESSAGES[errorCode];
  if (friendlyMessage) {
    return `Bing API error: ${friendlyMessage} (code ${errorCode})`;
  }
  const cleanMessage = message.replace(/^ERROR!!!\s*/i, '').trim();
  return `Bing API error: ${cleanMessage} (code ${errorCode})`;
}

export class BingWebmasterClient {
  private auth: BingAuthProvider;

  constructor(apiKeyOrAuth: string | BingAuthProvider) {
    if (typeof apiKeyOrAuth === 'string') {
      this.auth = new ApiKeyAuth(apiKeyOrAuth);
    } else {
      this.auth = apiKeyOrAuth;
    }
  }

  private async request<T>(method: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${BING_API_BASE}/${method}`);
    const headers = new Headers({ 'Accept': 'application/json' });
    
    this.auth.applyAuth(url, headers);
    
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    if (this.auth instanceof OAuthAuth) {
      await this.auth.refreshIfNeeded();
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });

    return this.handleResponse<T>(response, method);
  }

  private async postRequest<T>(method: string, body: unknown, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${BING_API_BASE}/${method}`);
    const headers = new Headers({
      'Accept': 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
    });
    
    this.auth.applyAuth(url, headers);
    
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    if (this.auth instanceof OAuthAuth) {
      await this.auth.refreshIfNeeded();
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    return this.handleResponse<T>(response, method);
  }

  private async handleResponse<T>(response: Response, method: string): Promise<T> {
    const contentType = response.headers.get('content-type') || '';
    
    if (!contentType.includes('json')) {
      if (!response.ok) {
        throw new Error(`Bing API error: ${response.status} ${response.statusText} for ${method}`);
      }
      return undefined as T;
    }

    const data = await response.json() as { d: T } | BingApiError;
    
    if ('ErrorCode' in data && data.ErrorCode !== 0) {
      throw new Error(formatApiError(data.ErrorCode, data.Message));
    }

    if (!response.ok) {
      throw new Error(`Bing API error: ${response.status} ${response.statusText} for ${method}`);
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
    await this.postRequest<void>('SubmitFeed', {
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
