// Bing Webmaster API Types
// NOTE: Field names verified against live API responses on 2026-11-05
// Stats fields (Query/Page/Traffic/Crawl) are UNVERIFIED - live data was empty

export interface BingSite {
  Url: string;
  IsVerified: boolean;
  // NOTE: IsOwner does NOT exist in live API response (removed)
  // Optional fields returned but not exposed to MCP tools (sensitive):
  // AuthenticationCode?: string;
  // DnsVerificationCode?: string;
}

// UNVERIFIED - live data was empty array
export interface BingRankAndTrafficStats {
  Date: string;
  Clicks: number;
  Impressions: number;
}

// UNVERIFIED - live data was empty array
export interface BingQueryStats {
  Query: string;
  Impressions: number;
  Clicks: number;
  AvgImpressionPosition: number;
  AvgClickPosition: number;
}

// UNVERIFIED - live data was empty array
export interface BingPageStats {
  Page: string;
  Impressions: number;
  Clicks: number;
  AvgImpressionPosition: number;
  AvgClickPosition: number;
}

// UNVERIFIED - live data was empty array
export interface BingCrawlStats {
  Date: string;
  CrawledPages: number;
  CrawlErrors: number;
  InIndex: number;
  BlockedByRobotsTxt: number;
}

// UNVERIFIED - live data was empty array
export interface BingCrawlIssue {
  Url: string;
  HttpCode: number;
  Date: string;
  InLinks: number;
  IssueType: string;
}

// VERIFIED against live API response
export interface BingUrlInfo {
  Url: string;
  HttpStatus: number;
  LastCrawledDate: string | null;
  DiscoveryDate: string | null;
  // Optional fields observed in live response:
  IsPage?: boolean;
  DocumentSize?: number;
  AnchorCount?: number;
  TotalChildUrlCount?: number;
  // NOTE: IsIndexed does NOT exist in live API response (removed)
  // NOTE: HttpCode renamed to HttpStatus
}

// VERIFIED against live API response
export interface BingSitemap {
  Url: string;
  Type: string;
  Status: string;
  Submitted: string;
  LastCrawled: string | null;
  UrlCount: number;
  FileSize?: number;
  Compressed?: boolean;
  // NOTE: Fields renamed from assumed LastSubmitted/LastDownload/TotalUrls/UrlsIndexed/Warnings/Errors
}

/**
 * URL Submission Quota
 * NOTE: DailyQuota and MonthlyQuota are REMAINING units, not total limits.
 * Observed starting values: ~100/day, ~2600/month for OAuth apps.
 * Values decrease after each SubmitUrl/SubmitUrlBatch call.
 * This differs from the "10,000 URLs/day" figure in Bing documentation,
 * which refers to the older URL Submission API limits.
 */
export interface BingUrlSubmissionQuota {
  DailyQuota: number;
  MonthlyQuota: number;
}

export interface BingApiError {
  ErrorCode: number;
  Message: string;
}

// IndexNow Types

export interface IndexNowSubmitResult {
  success: boolean;
  statusCode: number;
  message: string;
}

export interface IndexNowKeyValidation {
  valid: boolean;
  message: string;
  keyFileUrl?: string;
}

// AI Citation Report Types

export type AIReportType = 
  | 'AIPageStatsReport'
  | 'AIPerformanceOverviewStats'
  | 'AISearchQueriesReport';

export interface AIPageStats {
  page: string;
  citations: number;
}

export interface AIPerformanceOverview {
  date: string;
  citations: number;
  citedPages: number;
}

export interface AISearchQuery {
  groundingQuery: string;
  intent: string | null;
  topic: string | null;
  citations: number;
  citationShare: number | null;
}

export interface AIReportImportResult {
  reportType: AIReportType;
  recordCount: number;
  dateRange?: { start: string; end: string };
  importedAt: string;
}

// History Snapshot Types

export interface HistorySnapshot {
  id: number;
  siteUrl: string;
  snapshotType: 'query_stats' | 'page_stats' | 'crawl_stats';
  snapshotDate: string;
  recordCount: number;
}

export interface StatsDiff<T> {
  added: T[];
  removed: T[];
  changed: Array<{ before: T; after: T; changes: Partial<T> }>;
}
