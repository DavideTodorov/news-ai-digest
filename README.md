# news-ai-digest

Fetches Bulgarian news articles from RSS feeds, extracts full content, and generates daily AI-powered digests delivered to Discord.

## Services

| Service | Script | Schedule      | Description |
|---------|--------|---------------|-------------|
| RSS Fetcher | `fetcher/rss_fetcher.py` | Every 30 min  | Fetches articles from BGonAir and Investor.bg, extracts full content, stores in Postgres |
| BGonAir Summariser | `summariser/bgonair.py` | Daily 2am UTC | Summarises previous day's BGonAir articles, posts to Discord |
| Investor Summariser | `summariser/investor.py` | Daily 3am UTC | Summarises previous day's Investor.bg articles, posts to Discord |

## Project Structure

```
news-ai-digest/
├── fetcher/
│   ├── rss_fetcher.py
│   └── requirements.txt
├── summariser/
│   ├── lib/
│   │   ├── prompts.py        # System prompts for each source
│   │   ├── db.py             # Database helpers
│   │   ├── claude_batch.py   # Batch API submit/poll
│   │   └── discord.py        # Discord formatting and posting
│   ├── bgonair.py
│   └── investor.py
├── Dockerfile_rss_fetcher
├── Dockerfile_summariser_bgonair
├── Dockerfile_summariser_investor
└── analytics.sql
```

## Stack

- **Python 3.11+**
- **PostgreSQL** (Railway)
- **Claude Sonnet 4.6** via Anthropic Batch API
- **Discord** webhooks

## Database

Two tables:

```sql
-- Stores fetched articles
articles (id, article_id, feed_source, url, title, content, word_count, published_at, fetched_at, summarised)

-- Stores daily digests
digests (id, date, source, content, batch_id, created_at)
```

## Environment Variables

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
ANTHROPIC_API_KEY=your-anthropic-api-key
DISCORD_WEBHOOK_BGONAIR=https://discord.com/api/webhooks/...
DISCORD_WEBHOOK_INVESTOR=https://discord.com/api/webhooks/...
```

## Local Setup

```bash
python -m venv .venv
.venv/Scripts/pip install -r fetcher/requirements.txt        # RSS fetcher
.venv/Scripts/pip install -r summariser/requirements.txt     # Summarisers
```

## Deployment

Each service is deployed separately on Railway using its own Dockerfile:

- `Dockerfile_rss_fetcher`
- `Dockerfile_summariser_bgonair`
- `Dockerfile_summariser_investor`
