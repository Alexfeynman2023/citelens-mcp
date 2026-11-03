import { parse as csvParse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import type {
  AIReportType,
  AIPageStats,
  AIPerformanceOverview,
  AISearchQuery,
} from './types.js';

interface ColumnMapping {
  [key: string]: string[];
}

const PAGE_STATS_COLUMNS: ColumnMapping = {
  page: ['page', 'seite', 'página', 'ページ', 'url'],
  citations: ['citations', 'zitierungen', 'citas', 'citazioni', '引用数', '引用'],
};

const OVERVIEW_COLUMNS: ColumnMapping = {
  date: ['date', 'datum', 'fecha', 'data', '日付', '日期'],
  citations: ['citations', 'zitierungen', 'citas', 'citazioni', '引用数', '引用'],
  citedPages: ['cited pages', 'citedpages', 'cited_pages', 'zitierte seiten', 'páginas citadas', 'pagine citate', '引用ページ', '被引用页面'],
};

const SEARCH_QUERIES_COLUMNS: ColumnMapping = {
  groundingQuery: ['grounding query', 'groundingquery', 'grounding_query', 'abfrage', 'consulta', 'クエリ', '查询'],
  intent: ['intent', 'absicht', 'intención', 'intento', '意図', '意图'],
  topic: ['topic', 'thema', 'tema', 'argomento', 'トピック', '主题'],
  citations: ['citations', 'zitierungen', 'citas', 'citazioni', '引用数', '引用'],
  citationShare: ['citation share', 'citationshare', 'citation_share', 'zitierungsanteil', 'cuota de citas', 'シェア', '引用份额'],
};

function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, ' ')
    .replace(/[^\w\s\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g, '');
}

function findColumn(headers: string[], mapping: string[]): number {
  for (const variant of mapping) {
    const normalizedVariant = normalizeColumnName(variant);
    const idx = headers.findIndex(h => normalizeColumnName(h) === normalizedVariant);
    if (idx !== -1) return idx;
  }
  for (const variant of mapping) {
    const normalizedVariant = normalizeColumnName(variant);
    const idx = headers.findIndex(h => normalizeColumnName(h).includes(normalizedVariant));
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[,%]/g, '').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

function parsePercentage(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[%]/g, '').trim();
    if (cleaned === '' || cleaned === '-') return null;
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num / 100;
  }
  return null;
}

export interface ParseResult {
  reportType: AIReportType;
  data: AIPageStats[] | AIPerformanceOverview[] | AISearchQuery[];
}

export function detectReportType(headers: string[]): AIReportType | null {
  const hasPage = findColumn(headers, PAGE_STATS_COLUMNS.page) !== -1;
  const hasCitations = findColumn(headers, PAGE_STATS_COLUMNS.citations) !== -1;
  const hasDate = findColumn(headers, OVERVIEW_COLUMNS.date) !== -1;
  const hasCitedPages = findColumn(headers, OVERVIEW_COLUMNS.citedPages) !== -1;
  const hasGroundingQuery = findColumn(headers, SEARCH_QUERIES_COLUMNS.groundingQuery) !== -1;

  if (hasGroundingQuery && hasCitations) {
    return 'AISearchQueriesReport';
  }
  
  if (hasDate && hasCitations && hasCitedPages) {
    return 'AIPerformanceOverviewStats';
  }
  
  if (hasPage && hasCitations && !hasDate && !hasGroundingQuery) {
    return 'AIPageStatsReport';
  }

  return null;
}

export function parsePageStatsReport(rows: unknown[][], headers: string[]): AIPageStats[] {
  const pageIdx = findColumn(headers, PAGE_STATS_COLUMNS.page);
  const citationsIdx = findColumn(headers, PAGE_STATS_COLUMNS.citations);

  if (pageIdx === -1 || citationsIdx === -1) {
    throw new Error('Missing required columns for AIPageStatsReport: page, citations');
  }

  return rows.map(row => ({
    page: String(row[pageIdx] || ''),
    citations: parseNumber(row[citationsIdx]),
  })).filter(item => item.page);
}

export function parseOverviewReport(rows: unknown[][], headers: string[]): AIPerformanceOverview[] {
  const dateIdx = findColumn(headers, OVERVIEW_COLUMNS.date);
  const citationsIdx = findColumn(headers, OVERVIEW_COLUMNS.citations);
  const citedPagesIdx = findColumn(headers, OVERVIEW_COLUMNS.citedPages);

  if (dateIdx === -1 || citationsIdx === -1 || citedPagesIdx === -1) {
    throw new Error('Missing required columns for AIPerformanceOverviewStats: date, citations, cited pages');
  }

  return rows.map(row => ({
    date: String(row[dateIdx] || ''),
    citations: parseNumber(row[citationsIdx]),
    citedPages: parseNumber(row[citedPagesIdx]),
  })).filter(item => item.date);
}

export function parseSearchQueriesReport(rows: unknown[][], headers: string[]): AISearchQuery[] {
  const queryIdx = findColumn(headers, SEARCH_QUERIES_COLUMNS.groundingQuery);
  const intentIdx = findColumn(headers, SEARCH_QUERIES_COLUMNS.intent);
  const topicIdx = findColumn(headers, SEARCH_QUERIES_COLUMNS.topic);
  const citationsIdx = findColumn(headers, SEARCH_QUERIES_COLUMNS.citations);
  const shareIdx = findColumn(headers, SEARCH_QUERIES_COLUMNS.citationShare);

  if (queryIdx === -1 || citationsIdx === -1) {
    throw new Error('Missing required columns for AISearchQueriesReport: grounding query, citations');
  }

  return rows.map(row => ({
    groundingQuery: String(row[queryIdx] || ''),
    intent: intentIdx !== -1 && row[intentIdx] ? String(row[intentIdx]) : null,
    topic: topicIdx !== -1 && row[topicIdx] ? String(row[topicIdx]) : null,
    citations: parseNumber(row[citationsIdx]),
    citationShare: shareIdx !== -1 ? parsePercentage(row[shareIdx]) : null,
  })).filter(item => item.groundingQuery);
}

function stripBom(content: string): string {
  if (content.charCodeAt(0) === 0xFEFF) {
    return content.slice(1);
  }
  return content;
}

function detectDelimiter(content: string): string {
  const firstLine = content.split('\n')[0] || '';
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  
  if (semicolonCount > commaCount && semicolonCount > tabCount) {
    return ';';
  }
  if (tabCount > commaCount && tabCount > semicolonCount) {
    return '\t';
  }
  return ',';
}

function formatDetectedColumns(headers: string[]): string {
  return `Detected columns: [${headers.map(h => `"${h}"`).join(', ')}]`;
}

export function parseCsv(content: string): ParseResult {
  const cleanContent = stripBom(content);
  
  if (cleanContent.includes('\uFFFD')) {
    throw new Error('File appears to be in an unsupported encoding. Please save as UTF-8.');
  }
  
  const delimiter = detectDelimiter(cleanContent);
  
  const records = csvParse(cleanContent, {
    skip_empty_lines: true,
    relaxColumnCount: true,
    relaxQuotes: true,
    delimiter,
    trim: true,
  }) as unknown[][];

  if (records.length < 2) {
    throw new Error('CSV file is empty or has no data rows');
  }

  const headers = (records[0] as string[]).map(h => String(h).trim());
  const rows = records.slice(1).filter(row => 
    Array.isArray(row) && row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')
  );

  const reportType = detectReportType(headers);
  if (!reportType) {
    throw new Error(
      'Unable to detect report type. ' +
      formatDetectedColumns(headers) + '. ' +
      'Expected columns for AIPageStatsReport (page, citations), ' +
      'AIPerformanceOverviewStats (date, citations, cited pages), or ' +
      'AISearchQueriesReport (grounding query, citations)'
    );
  }

  let data: AIPageStats[] | AIPerformanceOverview[] | AISearchQuery[];

  switch (reportType) {
    case 'AIPageStatsReport':
      data = parsePageStatsReport(rows, headers);
      break;
    case 'AIPerformanceOverviewStats':
      data = parseOverviewReport(rows, headers);
      break;
    case 'AISearchQueriesReport':
      data = parseSearchQueriesReport(rows, headers);
      break;
  }

  return { reportType, data };
}

export function parseXlsx(buffer: Buffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  
  if (workbook.SheetNames.length === 0) {
    throw new Error('XLSX file has no sheets');
  }

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

  if (jsonData.length < 2) {
    throw new Error('XLSX file is empty or has no data rows');
  }

  const headers = (jsonData[0] as (string | number | null)[]).map(h => String(h ?? ''));
  const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== null && cell !== ''));

  const reportType = detectReportType(headers);
  if (!reportType) {
    throw new Error(
      'Unable to detect report type. ' +
      formatDetectedColumns(headers) + '. ' +
      'Expected columns for AIPageStatsReport (page, citations), ' +
      'AIPerformanceOverviewStats (date, citations, cited pages), or ' +
      'AISearchQueriesReport (grounding query, citations)'
    );
  }

  let data: AIPageStats[] | AIPerformanceOverview[] | AISearchQuery[];

  switch (reportType) {
    case 'AIPageStatsReport':
      data = parsePageStatsReport(rows, headers);
      break;
    case 'AIPerformanceOverviewStats':
      data = parseOverviewReport(rows, headers);
      break;
    case 'AISearchQueriesReport':
      data = parseSearchQueriesReport(rows, headers);
      break;
  }

  return { reportType, data };
}

export function parseReportFile(content: string | Buffer, filename: string): ParseResult {
  const ext = filename.toLowerCase().split('.').pop();
  
  if (ext === 'csv') {
    return parseCsv(typeof content === 'string' ? content : content.toString('utf-8'));
  } else if (ext === 'xlsx' || ext === 'xls') {
    return parseXlsx(Buffer.isBuffer(content) ? content : Buffer.from(content));
  } else {
    throw new Error(`Unsupported file format: ${ext}. Expected .csv or .xlsx`);
  }
}
