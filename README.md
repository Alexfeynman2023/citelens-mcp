# CiteLens MCP

**See how AI is citing your website.** An open-source MCP server that gives AI assistants access to your Bing Webmaster Tools data, IndexNow submission, and AI citation analysis.

[![CI](https://github.com/user/citelens-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/user/citelens-mcp/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/citelens-mcp.svg)](https://www.npmjs.com/package/citelens-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why CiteLens?

As AI-powered search (like Microsoft Copilot) becomes mainstream, understanding how your content is being cited by AI is crucial for SEO. CiteLens bridges the gap by:

- **Accessing your Bing Webmaster Tools data** directly from Claude, Cursor, or ChatGPT
- **Submitting URLs via IndexNow** for instant indexing across search engines
- **Analyzing AI citation reports** exported from Bing to understand which pages AI is citing
- **Tracking historical trends** since Bing stats update weekly with no date parameters

## 30-Second Quickstart

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "citelens": {
      "command": "npx",
      "args": ["-y", "citelens-mcp"],
      "env": {
        "BING_WEBMASTER_API_KEY": "your-api-key-here",
        "INDEXNOW_KEY": "your-indexnow-key"
      }
    }
  }
}
```

### Cursor

Add to your Cursor MCP settings:

```json
{
  "mcpServers": {
    "citelens": {
      "command": "npx",
      "args": ["-y", "citelens-mcp"],
      "env": {
        "BING_WEBMASTER_API_KEY": "your-api-key-here",
        "INDEXNOW_KEY": "your-indexnow-key"
      }
    }
  }
}
```

### Getting Your API Key

1. Go to [Bing Webmaster Tools](https://www.bing.com/webmasters)
2. Sign in and verify your site
3. Go to **Settings → API Access**
4. Generate your API key

## Available Tools

### Bing Webmaster Tools

| Tool | Description |
|------|-------------|
| `bing_list_sites` | List all verified sites |
| `bing_get_traffic` | Get traffic and ranking stats |
| `bing_get_query_stats` | Get search query (keyword) statistics |
| `bing_get_page_stats` | Get page-level statistics |
| `bing_get_crawl_stats` | Get crawl statistics over time |
| `bing_get_crawl_issues` | Get crawl errors and issues |
| `bing_get_url_info` | Get index status for a specific URL |
| `bing_list_sitemaps` | List submitted sitemaps |
| `bing_submit_sitemap` | Submit a new sitemap |
| `bing_get_url_submission_quota` | Check remaining URL submission quota |
| `bing_submit_url` | Submit a single URL for indexing |
| `bing_submit_url_batch` | Submit multiple URLs (max 500) |

### IndexNow (Recommended for URL Submission)

| Tool | Description |
|------|-------------|
| `indexnow_generate_key` | Generate a new IndexNow key |
| `indexnow_validate_key` | Check if your key file is accessible |
| `indexnow_submit_url` | Submit a URL via IndexNow |
| `indexnow_submit_batch` | Submit up to 10,000 URLs at once |

### AI Citation Analysis

| Tool | Description |
|------|-------------|
| `ai_import_citation_report` | Import CSV/XLSX export from Bing AI Performance |
| `ai_get_top_cited_pages` | Get pages with most AI citations |
| `ai_get_citation_trend` | View citation trend over time |
| `ai_get_top_queries` | Get top grounding queries |
| `ai_get_top_intents` | Get top intents from queries |
| `ai_get_top_topics` | Get top topics from queries |
| `ai_compare_with_bing_stats` | Compare AI citations with Bing search stats |
| `ai_get_import_history` | View history of imported reports |

### Historical Snapshots

| Tool | Description |
|------|-------------|
| `snapshot_stats` | Save current stats for historical comparison |
| `list_snapshots` | List all saved snapshots |
| `diff_stats` | Compare two snapshots to see changes |

## Example Prompts

Once configured, try asking your AI assistant:

- *"Show me my top 10 pages by Bing impressions"*
- *"Which of my pages are being cited by AI? Import the AI report from ~/Downloads/mysite_AIPageStatsReport.csv"*
- *"Submit these new blog posts to IndexNow: [urls]"*
- *"Compare my keyword rankings from last week to this week"*
- *"What crawl issues does Bing see on my site?"*
- *"How has my AI citation count trended over the past month?"*

## Configuration

| Environment Variable | Required | Description |
|---------------------|----------|-------------|
| `BING_WEBMASTER_API_KEY` | Yes (for Bing tools) | Your Bing Webmaster API key |
| `INDEXNOW_KEY` | No | Your IndexNow key (can also pass per-request) |
| `CITELENS_DATA_DIR` | No | Data directory (default: `~/.citelens`) |

## AI Citation Report Format

CiteLens accepts CSV/XLSX exports from Bing Webmaster Tools AI Performance section. It automatically detects these report types:

- **AIPageStatsReport**: Page URLs and citation counts
- **AIPerformanceOverviewStats**: Daily citation trends
- **AISearchQueriesReport**: Grounding queries, intents, topics, and citation share

The parser handles:
- Multiple languages (English, German, Spanish, Italian, Chinese, Japanese)
- Case and spacing variations in column names
- Numbers with commas and percentage formats
- Missing optional columns (Intent, Topic, Citation Share)

## How It Works

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Claude/Cursor  │────▶│   CiteLens MCP   │────▶│  Bing Webmaster │
│    ChatGPT      │     │    (stdio)       │     │  Tools API      │
└─────────────────┘     └────────┬─────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌────────────────┐
                        │  Local SQLite  │
                        │  (snapshots &  │
                        │   citations)   │
                        └────────────────┘
```

## Development

```bash
# Clone and install
git clone https://github.com/user/citelens-mcp
cd citelens-mcp
npm install

# Run tests
npm test

# Build
npm run build

# Run locally
BING_WEBMASTER_API_KEY=your-key npm run dev
```

## Roadmap

- [x] Bing Webmaster Tools integration
- [x] IndexNow submission
- [x] AI citation report import and analysis
- [x] Historical snapshot diffing
- [ ] **Hosted version** with OAuth 2.0 (no API key sharing needed)
- [ ] Google Search Console integration
- [ ] Automated weekly snapshots
- [ ] Citation alerts and monitoring
- [ ] Multi-site dashboard

## Trademark Disclaimer

This project is not affiliated with, endorsed by, or sponsored by Microsoft Corporation. "Bing" and "Microsoft Copilot" are trademarks of Microsoft Corporation. This tool works with Bing Webmaster Tools via its official API.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Questions?** Open an issue or reach out on Twitter/X.
