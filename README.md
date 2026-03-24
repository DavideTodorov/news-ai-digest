# news-ai-digest

Fetches Bulgarian news articles from RSS feeds, extracts full content, and generates daily AI-powered digests delivered to Discord.

## Services

| Service | Script | Schedule | Description |
|---------|--------|----------|-------------|
| RSS Fetcher | `rss_fetcher.py` | Every 30 min | Fetches articles from BGonAir and Investor.bg, extracts full content, stores in Postgres |
| Summariser | `ai_summariser.py` | Daily 8am | Summarises previous day's articles for all sources (BGonAir + Investor.bg), posts to separate Discord channels |
| Investor Today | `ai_summariser_investor_today.py` | On demand | Summarises today's Investor.bg articles |

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
.venv/Scripts/pip install -r requirements.txt           # RSS fetcher
.venv/Scripts/pip install -r requirements.summariser.txt  # Summarisers
```

## Deployment

Each service is deployed separately on Railway using its own Dockerfile:

- `Dockerfile_rss_fetcher`
- `Dockerfile_summariser` (runs `ai_summariser.py`)
- `Dockerfile_summariser_investor_today`

See `rss_fetcher_CLAUDE.md` and `ai_summariser_CLAUDE.md` for full implementation details.
