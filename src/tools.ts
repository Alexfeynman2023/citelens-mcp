import { readFileSync, existsSync } from 'node:fs';
import type { Config } from './config.js';
import { BingWebmasterClient } from './bing-client.js';
import { IndexNowClient } from './indexnow-client.js';
import { CiteLensDatabase } from './database.js';
import { parseReportFile } from './citation-parser.js';
import type {
  AIPageStats,
  AIPerformanceOverview,
  AISearchQuery,
} from './types.js';

export interface ToolContext {
  config: Config;
  getDatabase: () => CiteLensDatabase;
  getBingClient: () => BingWebmasterClient;
  getIndexNowClient: () => IndexNowClient;
}

export function createToolContext(config: Config): ToolContext {
  let database: CiteLensDatabase | null = null;
  let bingClient: BingWebmasterClient | null = null;
  let indexNowClient: IndexNowClient | null = null;

  return {
    config,
    getDatabase: () => {
      if (!database) {
        database = new CiteLensDatabase(config.dataDir);
      }
      return database;
    },
    getBingClient: () => {
      if (!bingClient) {
        if (!config.bingWebmasterApiKey) {
          throw new Error('BING_WEBMASTER_API_KEY environment variable is not set');
        }
        bingClient = new BingWebmasterClient(config.bingWebmasterApiKey);
      }
      return bingClient;
    },
    getIndexNowClient: () => {
      if (!indexNowClient) {
        indexNowClient = new IndexNowClient(config.indexNowKey);
      }
      return indexNowClient;
    },
  };
}

// Tool implementations

export async function listSites(ctx: ToolContext) {
  const client = ctx.getBingClient();
  return await client.getUserSites();
}

export async function getSiteTraffic(ctx: ToolContext, siteUrl: string) {
  const client = ctx.getBingClient();
  return await client.getRankAndTrafficStats(siteUrl);
}

export async function getQueryStats(ctx: ToolContext, siteUrl: string) {
  const client = ctx.getBingClient();
  return await client.getQueryStats(siteUrl);
}

export async function getPageStats(ctx: ToolContext, siteUrl: string) {
  const client = ctx.getBingClient();
  return await client.getPageStats(siteUrl);
}

export async function getCrawlStats(ctx: ToolContext, siteUrl: string) {
  const client = ctx.getBingClient();
  return await client.getCrawlStats(siteUrl);
}

export async function getCrawlIssues(ctx: ToolContext, siteUrl: string) {
  const client = ctx.getBingClient();
  return await client.getCrawlIssues(siteUrl);
}

export async function getUrlInfo(ctx: ToolContext, siteUrl: string, url: string) {
  const client = ctx.getBingClient();
  return await client.getUrlInfo(siteUrl, url);
}

export async function listSitemaps(ctx: ToolContext, siteUrl: string) {
  const client = ctx.getBingClient();
  return await client.getFeeds(siteUrl);
}

export async function submitSitemap(ctx: ToolContext, siteUrl: string, feedUrl: string) {
  const client = ctx.getBingClient();
  await client.submitFeed(siteUrl, feedUrl);
  return { success: true, message: `Sitemap ${feedUrl} submitted successfully` };
}

export async function getUrlSubmissionQuota(ctx: ToolContext, siteUrl: string) {
  const client = ctx.getBingClient();
  return await client.getUrlSubmissionQuota(siteUrl);
}

export async function submitUrlToBing(ctx: ToolContext, siteUrl: string, url: string) {
  const client = ctx.getBingClient();
  await client.submitUrl(siteUrl, url);
  return { success: true, message: `URL ${url} submitted to Bing successfully` };
}

export async function submitUrlBatchToBing(ctx: ToolContext, siteUrl: string, urls: string[]) {
  const client = ctx.getBingClient();
  await client.submitUrlBatch(siteUrl, urls);
  return { success: true, message: `${urls.length} URLs submitted to Bing successfully` };
}

// IndexNow tools

export function generateIndexNowKey(length = 32) {
  const key = IndexNowClient.generateKey(length);
  return {
    key,
    instructions: `Place this key in a text file at https://your-domain.com/${key}.txt with the content being just the key itself.`,
  };
}

export async function validateIndexNowKey(ctx: ToolContext, host: string, key?: string) {
  const client = ctx.getIndexNowClient();
  return await client.validateKeyFile(host, key);
}

export async function submitUrlViaIndexNow(
  ctx: ToolContext, 
  url: string, 
  key?: string, 
  keyLocation?: string
) {
  const client = ctx.getIndexNowClient();
  return await client.submitUrl(url, key, keyLocation);
}

export async function submitUrlBatchViaIndexNow(
  ctx: ToolContext,
  host: string,
  urls: string[],
  key?: string,
  keyLocation?: string
) {
  const client = ctx.getIndexNowClient();
  return await client.submitUrlBatch(host, urls, key, keyLocation);
}

// AI Citation tools

export function importAICitationReport(ctx: ToolContext, filePath: string, siteUrl: string) {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = readFileSync(filePath);
  const filename = filePath.split('/').pop() || filePath;
  const parseResult = parseReportFile(content, filename);

  const db = ctx.getDatabase();

  switch (parseResult.reportType) {
    case 'AIPageStatsReport':
      return db.importAIPageStats(siteUrl, parseResult.data as AIPageStats[], filename);
    case 'AIPerformanceOverviewStats':
      return db.importAIPerformanceOverview(siteUrl, parseResult.data as AIPerformanceOverview[], filename);
    case 'AISearchQueriesReport':
      return db.importAISearchQueries(siteUrl, parseResult.data as AISearchQuery[], filename);
  }
}

export function getTopCitedPages(ctx: ToolContext, siteUrl: string, limit = 20) {
  const db = ctx.getDatabase();
  return db.getTopCitedPages(siteUrl, limit);
}

export function getCitationTrend(ctx: ToolContext, siteUrl: string) {
  const db = ctx.getDatabase();
  return db.getCitationTrend(siteUrl);
}

export function getTopGroundingQueries(ctx: ToolContext, siteUrl: string, limit = 20) {
  const db = ctx.getDatabase();
  return db.getTopGroundingQueries(siteUrl, limit);
}

export function getTopIntents(ctx: ToolContext, siteUrl: string, limit = 10) {
  const db = ctx.getDatabase();
  return db.getTopIntents(siteUrl, limit);
}

export function getTopTopics(ctx: ToolContext, siteUrl: string, limit = 10) {
  const db = ctx.getDatabase();
  return db.getTopTopics(siteUrl, limit);
}

export function compareCitedPagesWithBingStats(ctx: ToolContext, siteUrl: string) {
  const db = ctx.getDatabase();
  return db.compareCitedPagesWithBingStats(siteUrl);
}

export function getAIImportHistory(ctx: ToolContext, siteUrl: string, reportType?: string) {
  const db = ctx.getDatabase();
  return db.getImportHistory(
    siteUrl, 
    reportType as 'AIPageStatsReport' | 'AIPerformanceOverviewStats' | 'AISearchQueriesReport' | undefined
  );
}

// History snapshot tools

export async function snapshotStats(ctx: ToolContext, siteUrl: string, statsType: 'query' | 'page' | 'crawl' | 'all') {
  const client = ctx.getBingClient();
  const db = ctx.getDatabase();
  const results: Array<{ type: string; recordCount: number; snapshotDate: string }> = [];

  if (statsType === 'query' || statsType === 'all') {
    const queryStats = await client.getQueryStats(siteUrl);
    const snapshot = db.snapshotQueryStats(siteUrl, queryStats);
    results.push({ type: 'query_stats', recordCount: snapshot.recordCount, snapshotDate: snapshot.snapshotDate });
  }

  if (statsType === 'page' || statsType === 'all') {
    const pageStats = await client.getPageStats(siteUrl);
    const snapshot = db.snapshotPageStats(siteUrl, pageStats);
    results.push({ type: 'page_stats', recordCount: snapshot.recordCount, snapshotDate: snapshot.snapshotDate });
  }

  if (statsType === 'crawl' || statsType === 'all') {
    const crawlStats = await client.getCrawlStats(siteUrl);
    const snapshot = db.snapshotCrawlStats(siteUrl, crawlStats);
    results.push({ type: 'crawl_stats', recordCount: snapshot.recordCount, snapshotDate: snapshot.snapshotDate });
  }

  return results;
}

export function listSnapshots(ctx: ToolContext, siteUrl: string) {
  const db = ctx.getDatabase();
  return db.listSnapshots(siteUrl);
}

export function diffStats(
  ctx: ToolContext, 
  siteUrl: string, 
  statsType: 'query' | 'page', 
  date1: string, 
  date2: string
) {
  const db = ctx.getDatabase();
  
  if (statsType === 'query') {
    return db.diffQueryStats(siteUrl, date1, date2);
  } else {
    return db.diffPageStats(siteUrl, date1, date2);
  }
}
