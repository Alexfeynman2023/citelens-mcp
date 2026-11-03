import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type {
  AIReportType,
  AIPageStats,
  AIPerformanceOverview,
  AISearchQuery,
  AIReportImportResult,
  BingQueryStats,
  BingPageStats,
  BingCrawlStats,
  HistorySnapshot,
  StatsDiff,
} from './types.js';

export class CiteLensDatabase {
  private db: Database.Database;

  constructor(dataDir: string) {
    const dbPath = join(dataDir, 'citelens.db');
    
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      -- AI Citation Reports
      CREATE TABLE IF NOT EXISTS ai_page_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_url TEXT NOT NULL,
        import_date TEXT NOT NULL,
        page TEXT NOT NULL,
        citations INTEGER NOT NULL,
        UNIQUE(site_url, import_date, page)
      );

      CREATE TABLE IF NOT EXISTS ai_performance_overview (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_url TEXT NOT NULL,
        import_date TEXT NOT NULL,
        date TEXT NOT NULL,
        citations INTEGER NOT NULL,
        cited_pages INTEGER NOT NULL,
        UNIQUE(site_url, import_date, date)
      );

      CREATE TABLE IF NOT EXISTS ai_search_queries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_url TEXT NOT NULL,
        import_date TEXT NOT NULL,
        grounding_query TEXT NOT NULL,
        intent TEXT,
        topic TEXT,
        citations INTEGER NOT NULL,
        citation_share REAL,
        UNIQUE(site_url, import_date, grounding_query)
      );

      CREATE TABLE IF NOT EXISTS ai_import_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_url TEXT NOT NULL,
        report_type TEXT NOT NULL,
        imported_at TEXT NOT NULL,
        filename TEXT,
        record_count INTEGER NOT NULL,
        date_range_start TEXT,
        date_range_end TEXT
      );

      -- History Snapshots
      CREATE TABLE IF NOT EXISTS query_stats_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_url TEXT NOT NULL,
        snapshot_date TEXT NOT NULL,
        query TEXT NOT NULL,
        impressions INTEGER NOT NULL,
        clicks INTEGER NOT NULL,
        avg_impression_position REAL NOT NULL,
        avg_click_position REAL NOT NULL,
        UNIQUE(site_url, snapshot_date, query)
      );

      CREATE TABLE IF NOT EXISTS page_stats_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_url TEXT NOT NULL,
        snapshot_date TEXT NOT NULL,
        page TEXT NOT NULL,
        impressions INTEGER NOT NULL,
        clicks INTEGER NOT NULL,
        avg_impression_position REAL NOT NULL,
        avg_click_position REAL NOT NULL,
        UNIQUE(site_url, snapshot_date, page)
      );

      CREATE TABLE IF NOT EXISTS crawl_stats_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_url TEXT NOT NULL,
        snapshot_date TEXT NOT NULL,
        date TEXT NOT NULL,
        crawled_pages INTEGER NOT NULL,
        crawl_errors INTEGER NOT NULL,
        in_index INTEGER NOT NULL,
        blocked_by_robots INTEGER NOT NULL,
        UNIQUE(site_url, snapshot_date, date)
      );

      CREATE TABLE IF NOT EXISTS snapshot_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_url TEXT NOT NULL,
        snapshot_type TEXT NOT NULL,
        snapshot_date TEXT NOT NULL,
        record_count INTEGER NOT NULL
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_ai_page_stats_site ON ai_page_stats(site_url, import_date);
      CREATE INDEX IF NOT EXISTS idx_ai_overview_site ON ai_performance_overview(site_url, import_date);
      CREATE INDEX IF NOT EXISTS idx_ai_queries_site ON ai_search_queries(site_url, import_date);
      CREATE INDEX IF NOT EXISTS idx_query_stats_site ON query_stats_snapshots(site_url, snapshot_date);
      CREATE INDEX IF NOT EXISTS idx_page_stats_site ON page_stats_snapshots(site_url, snapshot_date);
    `);
  }

  importAIPageStats(siteUrl: string, data: AIPageStats[], filename?: string): AIReportImportResult {
    const importDate = new Date().toISOString();
    
    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO ai_page_stats (site_url, import_date, page, citations)
      VALUES (?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((items: AIPageStats[]) => {
      for (const item of items) {
        insert.run(siteUrl, importDate, item.page, item.citations);
      }
    });

    insertMany(data);

    this.db.prepare(`
      INSERT INTO ai_import_log (site_url, report_type, imported_at, filename, record_count)
      VALUES (?, ?, ?, ?, ?)
    `).run(siteUrl, 'AIPageStatsReport', importDate, filename || null, data.length);

    return {
      reportType: 'AIPageStatsReport',
      recordCount: data.length,
      importedAt: importDate,
    };
  }

  importAIPerformanceOverview(siteUrl: string, data: AIPerformanceOverview[], filename?: string): AIReportImportResult {
    const importDate = new Date().toISOString();
    
    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO ai_performance_overview (site_url, import_date, date, citations, cited_pages)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((items: AIPerformanceOverview[]) => {
      for (const item of items) {
        insert.run(siteUrl, importDate, item.date, item.citations, item.citedPages);
      }
    });

    insertMany(data);

    const dates = data.map(d => d.date).sort();
    const dateRange = dates.length > 0 ? { start: dates[0], end: dates[dates.length - 1] } : undefined;

    this.db.prepare(`
      INSERT INTO ai_import_log (site_url, report_type, imported_at, filename, record_count, date_range_start, date_range_end)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(siteUrl, 'AIPerformanceOverviewStats', importDate, filename || null, data.length, dateRange?.start, dateRange?.end);

    return {
      reportType: 'AIPerformanceOverviewStats',
      recordCount: data.length,
      dateRange,
      importedAt: importDate,
    };
  }

  importAISearchQueries(siteUrl: string, data: AISearchQuery[], filename?: string): AIReportImportResult {
    const importDate = new Date().toISOString();
    
    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO ai_search_queries (site_url, import_date, grounding_query, intent, topic, citations, citation_share)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((items: AISearchQuery[]) => {
      for (const item of items) {
        insert.run(siteUrl, importDate, item.groundingQuery, item.intent, item.topic, item.citations, item.citationShare);
      }
    });

    insertMany(data);

    this.db.prepare(`
      INSERT INTO ai_import_log (site_url, report_type, imported_at, filename, record_count)
      VALUES (?, ?, ?, ?, ?)
    `).run(siteUrl, 'AISearchQueriesReport', importDate, filename || null, data.length);

    return {
      reportType: 'AISearchQueriesReport',
      recordCount: data.length,
      importedAt: importDate,
    };
  }

  getTopCitedPages(siteUrl: string, limit = 20): AIPageStats[] {
    return this.db.prepare(`
      SELECT page, citations
      FROM ai_page_stats
      WHERE site_url = ?
      AND import_date = (SELECT MAX(import_date) FROM ai_page_stats WHERE site_url = ?)
      ORDER BY citations DESC
      LIMIT ?
    `).all(siteUrl, siteUrl, limit) as AIPageStats[];
  }

  getCitationTrend(siteUrl: string): AIPerformanceOverview[] {
    return this.db.prepare(`
      SELECT date, citations, cited_pages as citedPages
      FROM ai_performance_overview
      WHERE site_url = ?
      AND import_date = (SELECT MAX(import_date) FROM ai_performance_overview WHERE site_url = ?)
      ORDER BY date ASC
    `).all(siteUrl, siteUrl) as AIPerformanceOverview[];
  }

  getTopGroundingQueries(siteUrl: string, limit = 20): AISearchQuery[] {
    return this.db.prepare(`
      SELECT grounding_query as groundingQuery, intent, topic, citations, citation_share as citationShare
      FROM ai_search_queries
      WHERE site_url = ?
      AND import_date = (SELECT MAX(import_date) FROM ai_search_queries WHERE site_url = ?)
      ORDER BY citations DESC
      LIMIT ?
    `).all(siteUrl, siteUrl, limit) as AISearchQuery[];
  }

  getTopIntents(siteUrl: string, limit = 10): Array<{ intent: string; totalCitations: number; queryCount: number }> {
    return this.db.prepare(`
      SELECT intent, SUM(citations) as totalCitations, COUNT(*) as queryCount
      FROM ai_search_queries
      WHERE site_url = ?
      AND import_date = (SELECT MAX(import_date) FROM ai_search_queries WHERE site_url = ?)
      AND intent IS NOT NULL AND intent != ''
      GROUP BY intent
      ORDER BY totalCitations DESC
      LIMIT ?
    `).all(siteUrl, siteUrl, limit) as Array<{ intent: string; totalCitations: number; queryCount: number }>;
  }

  getTopTopics(siteUrl: string, limit = 10): Array<{ topic: string; totalCitations: number; queryCount: number }> {
    return this.db.prepare(`
      SELECT topic, SUM(citations) as totalCitations, COUNT(*) as queryCount
      FROM ai_search_queries
      WHERE site_url = ?
      AND import_date = (SELECT MAX(import_date) FROM ai_search_queries WHERE site_url = ?)
      AND topic IS NOT NULL AND topic != ''
      GROUP BY topic
      ORDER BY totalCitations DESC
      LIMIT ?
    `).all(siteUrl, siteUrl, limit) as Array<{ topic: string; totalCitations: number; queryCount: number }>;
  }

  compareCitedPagesWithBingStats(siteUrl: string): Array<{
    page: string;
    aiCitations: number;
    bingImpressions: number | null;
    bingClicks: number | null;
    bingPosition: number | null;
  }> {
    return this.db.prepare(`
      SELECT 
        ap.page,
        ap.citations as aiCitations,
        ps.impressions as bingImpressions,
        ps.clicks as bingClicks,
        ps.avg_impression_position as bingPosition
      FROM ai_page_stats ap
      LEFT JOIN page_stats_snapshots ps 
        ON ap.page = ps.page 
        AND ps.site_url = ap.site_url
        AND ps.snapshot_date = (SELECT MAX(snapshot_date) FROM page_stats_snapshots WHERE site_url = ap.site_url)
      WHERE ap.site_url = ?
      AND ap.import_date = (SELECT MAX(import_date) FROM ai_page_stats WHERE site_url = ?)
      ORDER BY ap.citations DESC
    `).all(siteUrl, siteUrl) as Array<{
      page: string;
      aiCitations: number;
      bingImpressions: number | null;
      bingClicks: number | null;
      bingPosition: number | null;
    }>;
  }

  snapshotQueryStats(siteUrl: string, stats: BingQueryStats[]): HistorySnapshot {
    const snapshotDate = new Date().toISOString();
    
    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO query_stats_snapshots 
      (site_url, snapshot_date, query, impressions, clicks, avg_impression_position, avg_click_position)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((items: BingQueryStats[]) => {
      for (const item of items) {
        insert.run(siteUrl, snapshotDate, item.Query, item.Impressions, item.Clicks, item.AvgImpressionPosition, item.AvgClickPosition);
      }
    });

    insertMany(stats);

    const logStmt = this.db.prepare(`
      INSERT INTO snapshot_log (site_url, snapshot_type, snapshot_date, record_count)
      VALUES (?, ?, ?, ?)
    `);
    const result = logStmt.run(siteUrl, 'query_stats', snapshotDate, stats.length);

    return {
      id: result.lastInsertRowid as number,
      siteUrl,
      snapshotType: 'query_stats',
      snapshotDate,
      recordCount: stats.length,
    };
  }

  snapshotPageStats(siteUrl: string, stats: BingPageStats[]): HistorySnapshot {
    const snapshotDate = new Date().toISOString();
    
    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO page_stats_snapshots 
      (site_url, snapshot_date, page, impressions, clicks, avg_impression_position, avg_click_position)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((items: BingPageStats[]) => {
      for (const item of items) {
        insert.run(siteUrl, snapshotDate, item.Page, item.Impressions, item.Clicks, item.AvgImpressionPosition, item.AvgClickPosition);
      }
    });

    insertMany(stats);

    const logStmt = this.db.prepare(`
      INSERT INTO snapshot_log (site_url, snapshot_type, snapshot_date, record_count)
      VALUES (?, ?, ?, ?)
    `);
    const result = logStmt.run(siteUrl, 'page_stats', snapshotDate, stats.length);

    return {
      id: result.lastInsertRowid as number,
      siteUrl,
      snapshotType: 'page_stats',
      snapshotDate,
      recordCount: stats.length,
    };
  }

  snapshotCrawlStats(siteUrl: string, stats: BingCrawlStats[]): HistorySnapshot {
    const snapshotDate = new Date().toISOString();
    
    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO crawl_stats_snapshots 
      (site_url, snapshot_date, date, crawled_pages, crawl_errors, in_index, blocked_by_robots)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((items: BingCrawlStats[]) => {
      for (const item of items) {
        insert.run(siteUrl, snapshotDate, item.Date, item.CrawledPages, item.CrawlErrors, item.InIndex, item.BlockedByRobotsTxt);
      }
    });

    insertMany(stats);

    const logStmt = this.db.prepare(`
      INSERT INTO snapshot_log (site_url, snapshot_type, snapshot_date, record_count)
      VALUES (?, ?, ?, ?)
    `);
    const result = logStmt.run(siteUrl, 'crawl_stats', snapshotDate, stats.length);

    return {
      id: result.lastInsertRowid as number,
      siteUrl,
      snapshotType: 'crawl_stats',
      snapshotDate,
      recordCount: stats.length,
    };
  }

  listSnapshots(siteUrl: string): HistorySnapshot[] {
    return this.db.prepare(`
      SELECT id, site_url as siteUrl, snapshot_type as snapshotType, snapshot_date as snapshotDate, record_count as recordCount
      FROM snapshot_log
      WHERE site_url = ?
      ORDER BY snapshot_date DESC
    `).all(siteUrl) as HistorySnapshot[];
  }

  diffQueryStats(siteUrl: string, date1: string, date2: string): StatsDiff<BingQueryStats> {
    const stats1 = this.db.prepare(`
      SELECT query as Query, impressions as Impressions, clicks as Clicks, 
             avg_impression_position as AvgImpressionPosition, avg_click_position as AvgClickPosition
      FROM query_stats_snapshots
      WHERE site_url = ? AND snapshot_date = ?
    `).all(siteUrl, date1) as BingQueryStats[];

    const stats2 = this.db.prepare(`
      SELECT query as Query, impressions as Impressions, clicks as Clicks, 
             avg_impression_position as AvgImpressionPosition, avg_click_position as AvgClickPosition
      FROM query_stats_snapshots
      WHERE site_url = ? AND snapshot_date = ?
    `).all(siteUrl, date2) as BingQueryStats[];

    const map1 = new Map(stats1.map(s => [s.Query, s]));
    const map2 = new Map(stats2.map(s => [s.Query, s]));

    const added: BingQueryStats[] = [];
    const removed: BingQueryStats[] = [];
    const changed: Array<{ before: BingQueryStats; after: BingQueryStats; changes: Partial<BingQueryStats> }> = [];

    for (const [query, stat] of map2) {
      const oldStat = map1.get(query);
      if (!oldStat) {
        added.push(stat);
      } else if (
        oldStat.Impressions !== stat.Impressions ||
        oldStat.Clicks !== stat.Clicks ||
        oldStat.AvgImpressionPosition !== stat.AvgImpressionPosition
      ) {
        const changes: Partial<BingQueryStats> = {};
        if (oldStat.Impressions !== stat.Impressions) changes.Impressions = stat.Impressions - oldStat.Impressions;
        if (oldStat.Clicks !== stat.Clicks) changes.Clicks = stat.Clicks - oldStat.Clicks;
        if (oldStat.AvgImpressionPosition !== stat.AvgImpressionPosition) {
          changes.AvgImpressionPosition = stat.AvgImpressionPosition - oldStat.AvgImpressionPosition;
        }
        changed.push({ before: oldStat, after: stat, changes });
      }
    }

    for (const [query, stat] of map1) {
      if (!map2.has(query)) {
        removed.push(stat);
      }
    }

    return { added, removed, changed };
  }

  diffPageStats(siteUrl: string, date1: string, date2: string): StatsDiff<BingPageStats> {
    const stats1 = this.db.prepare(`
      SELECT page as Page, impressions as Impressions, clicks as Clicks, 
             avg_impression_position as AvgImpressionPosition, avg_click_position as AvgClickPosition
      FROM page_stats_snapshots
      WHERE site_url = ? AND snapshot_date = ?
    `).all(siteUrl, date1) as BingPageStats[];

    const stats2 = this.db.prepare(`
      SELECT page as Page, impressions as Impressions, clicks as Clicks, 
             avg_impression_position as AvgImpressionPosition, avg_click_position as AvgClickPosition
      FROM page_stats_snapshots
      WHERE site_url = ? AND snapshot_date = ?
    `).all(siteUrl, date2) as BingPageStats[];

    const map1 = new Map(stats1.map(s => [s.Page, s]));
    const map2 = new Map(stats2.map(s => [s.Page, s]));

    const added: BingPageStats[] = [];
    const removed: BingPageStats[] = [];
    const changed: Array<{ before: BingPageStats; after: BingPageStats; changes: Partial<BingPageStats> }> = [];

    for (const [page, stat] of map2) {
      const oldStat = map1.get(page);
      if (!oldStat) {
        added.push(stat);
      } else if (
        oldStat.Impressions !== stat.Impressions ||
        oldStat.Clicks !== stat.Clicks ||
        oldStat.AvgImpressionPosition !== stat.AvgImpressionPosition
      ) {
        const changes: Partial<BingPageStats> = {};
        if (oldStat.Impressions !== stat.Impressions) changes.Impressions = stat.Impressions - oldStat.Impressions;
        if (oldStat.Clicks !== stat.Clicks) changes.Clicks = stat.Clicks - oldStat.Clicks;
        if (oldStat.AvgImpressionPosition !== stat.AvgImpressionPosition) {
          changes.AvgImpressionPosition = stat.AvgImpressionPosition - oldStat.AvgImpressionPosition;
        }
        changed.push({ before: oldStat, after: stat, changes });
      }
    }

    for (const [page, stat] of map1) {
      if (!map2.has(page)) {
        removed.push(stat);
      }
    }

    return { added, removed, changed };
  }

  getImportHistory(siteUrl: string, reportType?: AIReportType): Array<{
    id: number;
    reportType: AIReportType;
    importedAt: string;
    filename: string | null;
    recordCount: number;
    dateRangeStart: string | null;
    dateRangeEnd: string | null;
  }> {
    const sql = reportType
      ? `SELECT id, report_type as reportType, imported_at as importedAt, filename, 
         record_count as recordCount, date_range_start as dateRangeStart, date_range_end as dateRangeEnd
         FROM ai_import_log WHERE site_url = ? AND report_type = ? ORDER BY imported_at DESC`
      : `SELECT id, report_type as reportType, imported_at as importedAt, filename, 
         record_count as recordCount, date_range_start as dateRangeStart, date_range_end as dateRangeEnd
         FROM ai_import_log WHERE site_url = ? ORDER BY imported_at DESC`;

    return (reportType 
      ? this.db.prepare(sql).all(siteUrl, reportType)
      : this.db.prepare(sql).all(siteUrl)
    ) as Array<{
      id: number;
      reportType: AIReportType;
      importedAt: string;
      filename: string | null;
      recordCount: number;
      dateRangeStart: string | null;
      dateRangeEnd: string | null;
    }>;
  }

  close(): void {
    this.db.close();
  }
}
