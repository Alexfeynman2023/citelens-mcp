import { describe, it, expect } from 'vitest';
import { parseCsv, parseXlsx, detectReportType } from './citation-parser.js';

describe('citation-parser', () => {
  describe('detectReportType', () => {
    it('should detect AIPageStatsReport', () => {
      const headers = ['Page', 'Citations'];
      expect(detectReportType(headers)).toBe('AIPageStatsReport');
    });

    it('should detect AIPerformanceOverviewStats', () => {
      const headers = ['Date', 'Citations', 'Cited pages'];
      expect(detectReportType(headers)).toBe('AIPerformanceOverviewStats');
    });

    it('should detect AISearchQueriesReport', () => {
      const headers = ['Grounding query', 'Intent', 'Topic', 'Citations', 'Citation share'];
      expect(detectReportType(headers)).toBe('AISearchQueriesReport');
    });

    it('should handle German column names', () => {
      const headers = ['Seite', 'Zitierungen'];
      expect(detectReportType(headers)).toBe('AIPageStatsReport');
    });

    it('should handle case variations', () => {
      const headers = ['PAGE', 'CITATIONS'];
      expect(detectReportType(headers)).toBe('AIPageStatsReport');
    });

    it('should return null for unknown format', () => {
      const headers = ['Unknown', 'Columns'];
      expect(detectReportType(headers)).toBeNull();
    });
  });

  describe('parseCsv', () => {
    it('should parse AIPageStatsReport CSV', () => {
      const csv = `Page,Citations
https://example.com/page1,150
https://example.com/page2,100
https://example.com/page3,50`;

      const result = parseCsv(csv);
      expect(result.reportType).toBe('AIPageStatsReport');
      expect(result.data).toHaveLength(3);
      expect(result.data[0]).toEqual({
        page: 'https://example.com/page1',
        citations: 150,
      });
    });

    it('should parse AIPerformanceOverviewStats CSV', () => {
      const csv = `Date,Citations,Cited pages
2024-01-01,500,25
2024-01-02,520,27
2024-01-03,510,26`;

      const result = parseCsv(csv);
      expect(result.reportType).toBe('AIPerformanceOverviewStats');
      expect(result.data).toHaveLength(3);
      expect(result.data[0]).toEqual({
        date: '2024-01-01',
        citations: 500,
        citedPages: 25,
      });
    });

    it('should parse AISearchQueriesReport CSV', () => {
      const csv = `Grounding query,Intent,Topic,Citations,Citation share
what is seo,informational,SEO,200,15%
best seo tools,commercial,Tools,150,10%
seo tutorial,,SEO,100,8%`;

      const result = parseCsv(csv);
      expect(result.reportType).toBe('AISearchQueriesReport');
      expect(result.data).toHaveLength(3);
      expect(result.data[0]).toEqual({
        groundingQuery: 'what is seo',
        intent: 'informational',
        topic: 'SEO',
        citations: 200,
        citationShare: 0.15,
      });
      expect(result.data[2]).toEqual({
        groundingQuery: 'seo tutorial',
        intent: null,
        topic: 'SEO',
        citations: 100,
        citationShare: 0.08,
      });
    });

    it('should handle numbers with commas', () => {
      const csv = `Page,Citations
https://example.com/page1,"1,500"
https://example.com/page2,"10,000"`;

      const result = parseCsv(csv);
      expect(result.data[0]).toEqual({
        page: 'https://example.com/page1',
        citations: 1500,
      });
      expect(result.data[1]).toEqual({
        page: 'https://example.com/page2',
        citations: 10000,
      });
    });

    it('should handle empty citation share', () => {
      const csv = `Grounding query,Citations,Citation share
query1,100,-
query2,50,`;

      const result = parseCsv(csv);
      expect(result.reportType).toBe('AISearchQueriesReport');
      expect(result.data[0]).toMatchObject({
        groundingQuery: 'query1',
        citationShare: null,
      });
      expect(result.data[1]).toMatchObject({
        groundingQuery: 'query2',
        citationShare: null,
      });
    });

    it('should skip empty rows', () => {
      const csv = `Page,Citations
https://example.com/page1,100

https://example.com/page2,50`;

      const result = parseCsv(csv);
      expect(result.data).toHaveLength(2);
    });

    it('should throw on empty CSV', () => {
      expect(() => parseCsv('')).toThrow('CSV file is empty');
    });

    it('should throw on unrecognized format', () => {
      const csv = `Name,Value
test,123`;

      expect(() => parseCsv(csv)).toThrow('Unable to detect report type');
    });
  });

  describe('parseXlsx', () => {
    it('should parse XLSX buffer', () => {
      const XLSX = require('xlsx');
      
      const ws = XLSX.utils.aoa_to_sheet([
        ['Page', 'Citations'],
        ['https://example.com/page1', 100],
        ['https://example.com/page2', 50],
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const result = parseXlsx(buffer);
      expect(result.reportType).toBe('AIPageStatsReport');
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        page: 'https://example.com/page1',
        citations: 100,
      });
    });
  });
});
