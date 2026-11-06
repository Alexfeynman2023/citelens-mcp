# CiteLens MCP

**See how AI is citing your website.** An open-source MCP server that gives AI assistants access to your Bing Webmaster Tools data, IndexNow submission, and AI citation analysis.

[![CI](https://github.com/Alexfeynman2023/citelens-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Alexfeynman2023/citelens-mcp/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/citelens-mcp.svg)](https://www.npmjs.com/package/citelens-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why CiteLens?

As AI-powered search becomes mainstream, understanding how your content is being cited by AI is crucial for SEO. CiteLens bridges the gap by letting you:

- **Access your Bing Webmaster Tools data** directly from Claude, Cursor, or any MCP client
- **Submit URLs via IndexNow** for instant indexing across search engines
- **Analyze AI citation reports** exported from Bing to understand which pages AI is citing
- **Track historical trends** since Bing stats update weekly with no date parameters

## Quick Start

### Prerequisites

Get your Bing Webmaster API key:
1. Go to [Bing Webmaster Tools](https://www.bing.com/webmasters)
2. Sign in and verify your site
3. Go to **Settings → API Access**
4. Generate your API key

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

Add to your Cursor MCP settings (Settings → MCP):

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

### Hermes Agent

Install the CiteLens plugin:

```bash
hermes plugins install Alexfeynman2023/citelens-mcp --subdir hermes
hermes plugins enable citelens
```

Or add to your Hermes config:

```yaml
mcp_servers:
  citelens:
    command: npx
    args: ["-y", "citelens-mcp"]
    env:
      BING_WEBMASTER_API_KEY: ${BING_WEBMASTER_API_KEY}
      INDEXNOW_KEY: ${INDEXNOW_KEY}
```

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

### IndexNow (Instant URL Indexing)

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

- *"Show me my top 10 pages by impressions"*
- *"Which of my pages are being cited by AI? Import the AI report from ~/Downloads/mysite_AIPageStatsReport.csv"*
- *"Submit these new blog posts to IndexNow: [urls]"*
- *"Compare my keyword rankings from last week to this week"*
- *"What crawl issues does the search engine see on my site?"*
- *"How has my AI citation count trended over the past month?"*

## Authentication

### Option 1: API Key (Simple)

Set the `BING_WEBMASTER_API_KEY` environment variable. This is the easiest option for personal use.

### Option 2: OAuth Token File (Advanced)

For OAuth 2.0 authentication, create `~/.citelens/token.json`:

```json
{
  "access_token": "your-access-token",
  "refresh_token": "your-refresh-token",
  "expires_at": 1700000000000,
  "client_id": "your-client-id",
  "client_secret": "your-client-secret"
}
```

Override the token file location with `CITELENS_TOKEN_FILE`.

### Option 3: Environment Variables (OAuth)

For containers or CI/CD:

```bash
export CITELENS_ACCESS_TOKEN="your-access-token"
export CITELENS_REFRESH_TOKEN="your-refresh-token"
export CITELENS_TOKEN_EXPIRES_AT="1700000000000"
export CITELENS_CLIENT_ID="your-client-id"
export CITELENS_CLIENT_SECRET="your-client-secret"
```

## Configuration

| Environment Variable | Required | Description |
|---------------------|----------|-------------|
| `BING_WEBMASTER_API_KEY` | Yes* | Your Bing Webmaster API key |
| `CITELENS_ACCESS_TOKEN` | Yes* | OAuth access token (alternative to API key) |
| `CITELENS_REFRESH_TOKEN` | No | OAuth refresh token for auto-refresh |
| `CITELENS_CLIENT_ID` | No | OAuth client ID (required for auto-refresh) |
| `CITELENS_CLIENT_SECRET` | No | OAuth client secret (required for auto-refresh) |
| `CITELENS_TOKEN_FILE` | No | Custom path to token.json (default: `~/.citelens/token.json`) |
| `INDEXNOW_KEY` | No | Your IndexNow key (can also pass per-request) |
| `CITELENS_DATA_DIR` | No | Data directory (default: `~/.citelens`) |

*Either `BING_WEBMASTER_API_KEY` or `CITELENS_ACCESS_TOKEN` (or token file) is required.

## Security Notes

- **API keys are sensitive.** Never commit them to version control.
- **Token files are created with mode 600** (owner read/write only).
- **OAuth tokens auto-refresh** when client credentials are provided, with the refreshed tokens written back to the token file.
- **Local SQLite database** stores only your own imported reports and snapshots in `~/.citelens/`.

## How It Works

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Claude/Cursor  │────▶│   CiteLens MCP   │────▶│  Bing Webmaster │
│    Hermes       │     │    (stdio)       │     │  Tools API      │
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
git clone https://github.com/Alexfeynman2023/citelens-mcp
cd citelens-mcp
npm install

# Run tests
npm test

# Type check
npm run typecheck

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
- [x] OAuth 2.0 support with auto-refresh
- [x] Hermes Agent plugin
- [ ] **Hosted version** with web dashboard (no API key sharing needed)
- [ ] Google Search Console integration
- [ ] Automated weekly snapshots
- [ ] Citation alerts and monitoring
- [ ] Multi-site dashboard

**Interested in a hosted version?** [Let us know!](https://github.com/Alexfeynman2023/citelens-mcp/issues/new?template=hosted_version_interest.md)

## Trademark Disclaimer

This project is not affiliated with, endorsed by, or sponsored by Microsoft Corporation. This tool works with Bing Webmaster Tools via its official API.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Questions?** [Open an issue](https://github.com/Alexfeynman2023/citelens-mcp/issues/new) or reach out on X.
