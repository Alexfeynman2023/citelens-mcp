// Bing Webmaster API Types

export interface BingSite {
  Url: string;
  IsOwner: boolean;
  IsVerified: boolean;
}

export interface BingRankAndTrafficStats {
  Date: string;
  Clicks: number;
  Impressions: number;
}

export interface BingQueryStats {
  Query: string;
  Impressions: number;
  Clicks: number;
  AvgImpressionPosition: number;
  AvgClickPosition: number;
}

export interface BingPageStats {
  Page: string;
  Impressions: number;
  Clicks: number;
  AvgImpressionPosition: number;
  AvgClickPosition: number;
}

export interface BingCrawlStats {
  Date: string;
  CrawledPages: number;
  CrawlErrors: number;
  InIndex: number;
  BlockedByRobotsTxt: number;
}

export interface BingCrawlIssue {
  Url: string;
  HttpCode: number;
  Date: string;
  InLinks: number;
  IssueType: string;
}

export interface BingUrlInfo {
  Url: string;
  IsIndexed: boolean;
  LastCrawledDate: string | null;
  HttpCode: number;
  DiscoveryDate: string | null;
}

export interface BingSitemap {
  Url: string;
  LastSubmitted: string;
  LastDownload: string | null;
  TotalUrls: number;
  UrlsIndexed: number;
  Warnings: number;
  Errors: number;
}

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
