#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { loadConfig, validateConfig } from './config.js';
import { createToolContext, type ToolContext } from './tools.js';
import * as tools from './tools.js';

const TOOLS: Tool[] = [
  // Bing Webmaster Tools
  {
    name: 'bing_list_sites',
    description: 'List all sites verified in Bing Webmaster Tools for the current API key',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'bing_get_traffic',
    description: 'Get traffic and ranking statistics for a site from Bing. Data updates weekly.',
    inputSchema: {
      type: 'object',
      properties: {
        siteUrl: {
          type: 'string',
          description: 'The site URL (e.g., https://example.com)',
        },
      },
      required: ['siteUrl'],
    },
  },
  {
    name: 'bing_get_query_stats',
    description: 'Get search query (keyword) statistics for a site from Bing. Shows impressions, clicks, and positions. Data updates weekly.',
    inputSchema: {
      type: 'object',
      properties: {
        siteUrl: {
          type: 'string',
          description: 'The site URL',
        },
      },
      required: ['siteUrl'],
    },
  },
  {
    name: 'bing_get_page_stats',
    description: 'Get page-level statistics for a site from Bing. Shows impressions, clicks, and positions per page. Data updates weekly.',
    inputSchema: {
      type: 'object',
      properties: {
        siteUrl: {
          type: 'string',
          description: 'The site URL',
        },
      },
      required: ['siteUrl'],
    },
  },
  {
    name: 'bing_get_crawl_stats',
    description: 'Get crawl statistics for a site from Bing. Shows pages crawled, errors, and index status over time.',
    inputSchema: {
      type: 'object',
      properties: {
        siteUrl: {
          type: 'string',
          description: 'The site URL',
        },
      },
      required: ['siteUrl'],
    },
  },
  {
    name: 'bing_get_crawl_issues',
    description: 'Get crawl issues/errors for a site from Bing. Shows URLs with problems, HTTP codes, and issue types.',
    inputSchema: {
      type: 'object',
      properties: {
        siteUrl: {
          type: 'string',
          description: 'The site URL',
        },
      },
      required: ['siteUrl'],
    },
  },
  {
    name: 'bing_get_url_info',
    description: 'Get index status and crawl information for a specific URL from Bing.',
    inputSchema: {
      type: 'object',
      properties: {
        siteUrl: {
          type: 'string',
          description: 'The site URL',
        },
        url: {
          type: 'string',
          description: 'The specific URL to check',
        },
      },
      required: ['siteUrl', 'url'],
    },
  },
  {
    name: 'bing_list_sitemaps',
    description: 'List all sitemaps submitted for a site in Bing Webmaster Tools.',
    inputSchema: {
      type: 'object',
      properties: {
        siteUrl: {
          type: 'string',
          description: 'The site URL',
        },
      },
      required: ['siteUrl'],
    },
  },
  {
    name: 'bing_submit_sitemap',
    description: 'Submit a sitemap to Bing Webmaster Tools.',
    inputSchema: {
      type: 'object',
      properties: {
        siteUrl: {
          type: 'string',
          description: 'The site URL',
        },
        feedUrl: {
          type: 'string',
          description: 'The sitemap URL to submit',
        },
      },
      required: ['siteUrl', 'feedUrl'],
    },
  },
  {
    name: 'bing_get_url_submission_quota',
    description: 'Get the remaining URL submission quota for a site in Bing. Daily limit is 10,000 URLs per domain.',
    inputSchema: {
      type: 'object',
      properties: {
        siteUrl: {
          type: 'string',
          description: 'The site URL',
        },
      },
      required: ['siteUrl'],
    },
  },
  {
    name: 'bing_submit_url',
    description: 'Submit a single URL to Bing for indexing. Use IndexNow as primary method; this is a fallback.',
    inputSchema: {
      type: 'object',
      properties: {
        siteUrl: {
          type: 'string',
          description: 'The site URL',
        },
        url: {
          type: 'string',
          description: 'The URL to submit for indexing',
        },
      },
      required: ['siteUrl', 'url'],
    },
  },
  {
    name: 'bing_submit_url_batch',
    description: 'Submit multiple URLs to Bing for indexing (max 500 per batch). Use IndexNow as primary method; this is a fallback.',
    inputSchema: {
      type: 'object',
      properties: {
        siteUrl: {
          type: 'string',
          description: 'The site URL',
        },
        urls: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of URLs to submit (max 500)',
        },
      },
      required: ['siteUrl', 'urls'],
    },
  },

  // IndexNow Tools
  {
    name: 'indexnow_generate_key',
    description: 'Generate a new IndexNow key. The key must be placed in a .txt file on your site root.',
    inputSchema: {
      type: 'object',
      properties: {
        length: {
          type: 'number',
          description: 'Key length (8-128 characters, default 32)',
        },
      },
      required: [],
    },
  },
  {
    name: 'indexnow_validate_key',
    description: 'Validate that an IndexNow key file is accessible and contains the correct key.',
    inputSchema: {
      type: 'object',
      properties: {
        host: {
          type: 'string',
          description: 'The hostname (e.g., example.com)',
        },
        key: {
          type: 'string',
          description: 'The IndexNow key (uses INDEXNOW_KEY env var if not provided)',
        },
      },
      required: ['host'],
    },
  },
  {
    name: 'indexnow_submit_url',
    description: 'Submit a single URL via IndexNow for instant indexing by multiple search engines.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to submit',
        },
        key: {
          type: 'string',
          description: 'The IndexNow key (uses INDEXNOW_KEY env var if not provided)',
        },
        keyLocation: {
          type: 'string',
          description: 'Custom key file location URL (optional)',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'indexnow_submit_batch',
    description: 'Submit multiple URLs via IndexNow (max 10,000 per submission) for instant indexing.',
    inputSchema: {
      type: 'object',
      properties: {
        host: {
          type: 'string',
          description: 'The hostname for all URLs',
        },
        urls: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of URLs to submit (max 10,000)',
        },
        key: {
          type: 'string',
          description: 'The IndexNow key (uses INDEXNOW_KEY env var if not provided)',
        },
        keyLocation: {
          type: 'string',
          description: 'Custom key file location URL (optional)',
        },
      },
      required: ['host', 'urls'],
    },
  },

  // AI Citation Tools
  {
    name: 'ai_import_citation_report',
    description: 'Import an AI citation report (CSV or XLSX) exported from Bing Webmaster Tools AI Performance section. Automatically detects report type (PageStats, Overview, or SearchQueries).',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to the CSV or XLSX file to import',
        },
        siteUrl: {
          type: 'string',
          description: 'The site URL this report belongs to',
        },
      },
      required: ['filePath', 'siteUrl'],
    },
  },
  {
    name: 'ai_get_top_cited_pages',
    description: 'Get the top cited pages from imported AI citation reports.',
    inputSchema: {
      type: 'object',
      properties: {
        siteUrl: {
          type: 'string',
          description: 'The site URL',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of pages to return (default 20)',
        },
      },
      required: ['siteUrl'],
    },
  },
  {
    name: 'ai_get_citation_trend',
    description: 'Get citation trend over time from imported AI Performance Overview reports.',
    inputSchema: {
      type: 'object',
      properties: {
        siteUrl: {
          type: 'string',
          description: 'The site URL',
        },
      },
      required: ['siteUrl'],
    },
  },
  {
    name: 'ai_get_top_queries',
    description: 'Get top grounding queries from imported AI Search Queries reports.',
    inputSchema: {
      type: 'object',
      properties: {
        siteUrl: {
          type: 'string',
          description: 'The site URL',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of queries to return (default 20)',
        },
      },
      required: ['siteUrl'],
    },
  },
  {
    name: 'ai_get_top_intents',
    description: 'Get top intents aggregated from AI Search Queries reports.',
    inputSchema: {
      type: 'object',
      properties: {
        siteUrl: {
          type: 'string',
          description: 'The site URL',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of intents to return (default 10)',
        },
      },
      required: ['siteUrl'],
    },
  },
  {
    name: 'ai_get_top_topics',
    description: 'Get top topics aggregated from AI Search Queries reports.',
    inputSchema: {
      type: 'object',
      properties: {
        siteUrl: {
          type: 'string',
          description: 'The site URL',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of topics to return (default 10)',
        },
      },
      required: ['siteUrl'],
    },
  },
  {
    name: 'ai_compare_with_bing_stats',
    description: 'Compare AI-cited pages with Bing search page statistics. Requires both AI citation import and page stats snapshot.',
    inputSchema: {
      type: 'object',
      properties: {
        siteUrl: {
          type: 'string',
          description: 'The site URL',
        },
      },
      required: ['siteUrl'],
    },
  },
  {
    name: 'ai_get_import_history',
    description: 'Get history of imported AI citation reports.',
    inputSchema: {
      type: 'object',
      properties: {
        siteUrl: {
          type: 'string',
          description: 'The site URL',
        },
        reportType: {
          type: 'string',
          enum: ['AIPageStatsReport', 'AIPerformanceOverviewStats', 'AISearchQueriesReport'],
          description: 'Filter by report type (optional)',
        },
      },
      required: ['siteUrl'],
    },
  },

  // History Snapshot Tools
  {
    name: 'snapshot_stats',
    description: 'Take a snapshot of current Bing stats and store locally for historical comparison. Data updates weekly, so snapshot weekly.',
    inputSchema: {
      type: 'object',
      properties: {
        siteUrl: {
          type: 'string',
          description: 'The site URL',
        },
        statsType: {
          type: 'string',
          enum: ['query', 'page', 'crawl', 'all'],
          description: 'Type of stats to snapshot (default: all)',
        },
      },
      required: ['siteUrl'],
    },
  },
  {
    name: 'list_snapshots',
    description: 'List all saved snapshots for a site.',
    inputSchema: {
      type: 'object',
      properties: {
        siteUrl: {
          type: 'string',
          description: 'The site URL',
        },
      },
      required: ['siteUrl'],
    },
  },
  {
    name: 'diff_stats',
    description: 'Compare two snapshots to see what changed between them.',
    inputSchema: {
      type: 'object',
      properties: {
        siteUrl: {
          type: 'string',
          description: 'The site URL',
        },
        statsType: {
          type: 'string',
          enum: ['query', 'page'],
          description: 'Type of stats to compare',
        },
        date1: {
          type: 'string',
          description: 'First snapshot date (ISO format)',
        },
        date2: {
          type: 'string',
          description: 'Second snapshot date (ISO format)',
        },
      },
      required: ['siteUrl', 'statsType', 'date1', 'date2'],
    },
  },
];

async function handleToolCall(ctx: ToolContext, name: string, args: Record<string, unknown>) {
  switch (name) {
    // Bing Webmaster Tools
    case 'bing_list_sites':
      return await tools.listSites(ctx);
    case 'bing_get_traffic':
      return await tools.getSiteTraffic(ctx, args.siteUrl as string);
    case 'bing_get_query_stats':
      return await tools.getQueryStats(ctx, args.siteUrl as string);
    case 'bing_get_page_stats':
      return await tools.getPageStats(ctx, args.siteUrl as string);
    case 'bing_get_crawl_stats':
      return await tools.getCrawlStats(ctx, args.siteUrl as string);
    case 'bing_get_crawl_issues':
      return await tools.getCrawlIssues(ctx, args.siteUrl as string);
    case 'bing_get_url_info':
      return await tools.getUrlInfo(ctx, args.siteUrl as string, args.url as string);
    case 'bing_list_sitemaps':
      return await tools.listSitemaps(ctx, args.siteUrl as string);
    case 'bing_submit_sitemap':
      return await tools.submitSitemap(ctx, args.siteUrl as string, args.feedUrl as string);
    case 'bing_get_url_submission_quota':
      return await tools.getUrlSubmissionQuota(ctx, args.siteUrl as string);
    case 'bing_submit_url':
      return await tools.submitUrlToBing(ctx, args.siteUrl as string, args.url as string);
    case 'bing_submit_url_batch':
      return await tools.submitUrlBatchToBing(ctx, args.siteUrl as string, args.urls as string[]);

    // IndexNow
    case 'indexnow_generate_key':
      return tools.generateIndexNowKey(args.length as number | undefined);
    case 'indexnow_validate_key':
      return await tools.validateIndexNowKey(ctx, args.host as string, args.key as string | undefined);
    case 'indexnow_submit_url':
      return await tools.submitUrlViaIndexNow(
        ctx,
        args.url as string,
        args.key as string | undefined,
        args.keyLocation as string | undefined
      );
    case 'indexnow_submit_batch':
      return await tools.submitUrlBatchViaIndexNow(
        ctx,
        args.host as string,
        args.urls as string[],
        args.key as string | undefined,
        args.keyLocation as string | undefined
      );

    // AI Citation
    case 'ai_import_citation_report':
      return tools.importAICitationReport(ctx, args.filePath as string, args.siteUrl as string);
    case 'ai_get_top_cited_pages':
      return tools.getTopCitedPages(ctx, args.siteUrl as string, args.limit as number | undefined);
    case 'ai_get_citation_trend':
      return tools.getCitationTrend(ctx, args.siteUrl as string);
    case 'ai_get_top_queries':
      return tools.getTopGroundingQueries(ctx, args.siteUrl as string, args.limit as number | undefined);
    case 'ai_get_top_intents':
      return tools.getTopIntents(ctx, args.siteUrl as string, args.limit as number | undefined);
    case 'ai_get_top_topics':
      return tools.getTopTopics(ctx, args.siteUrl as string, args.limit as number | undefined);
    case 'ai_compare_with_bing_stats':
      return tools.compareCitedPagesWithBingStats(ctx, args.siteUrl as string);
    case 'ai_get_import_history':
      return tools.getAIImportHistory(ctx, args.siteUrl as string, args.reportType as string | undefined);

    // History Snapshots
    case 'snapshot_stats':
      return await tools.snapshotStats(
        ctx,
        args.siteUrl as string,
        (args.statsType as 'query' | 'page' | 'crawl' | 'all') || 'all'
      );
    case 'list_snapshots':
      return tools.listSnapshots(ctx, args.siteUrl as string);
    case 'diff_stats':
      return tools.diffStats(
        ctx,
        args.siteUrl as string,
        args.statsType as 'query' | 'page',
        args.date1 as string,
        args.date2 as string
      );

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function main() {
  const config = loadConfig();
  const warnings = validateConfig(config);
  
  for (const warning of warnings) {
    console.error(`[CiteLens] Warning: ${warning}`);
  }

  const ctx = createToolContext(config);

  const server = new Server(
    {
      name: 'citelens-mcp',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    try {
      const result = await handleToolCall(ctx, name, args as Record<string, unknown>);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: message }),
          },
        ],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
