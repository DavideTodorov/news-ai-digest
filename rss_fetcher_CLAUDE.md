# RSS Feed Fetcher — CLAUDE.md

## Purpose
Fetch articles from RSS feeds, extract full article content, and store them in a PostgreSQL database. Runs as a scheduled cron job on Railway.

## Stack
- Python 3.11+
- `feedparser` — RSS parsing
- `requests` + `trafilatura` — full article content extraction
- `beautifulsoup4` — HTML fallback stripping
- `psycopg2-binary` — Postgres connection
- `python-dotenv` — env vars

## Feeds
| Name | URL |
|------|-----|
| BGonAir | https://www.bgonair.bg/rss/c/2-bulgaria |
| Investor.bg Top News | https://www.investor.bg/rss/c/578-top-novini |

## Database Schema

```sql
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    article_id TEXT UNIQUE,
    feed_source TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    content TEXT,
    word_count INTEGER,
    published_at TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    summarised BOOLEAN DEFAULT FALSE
);
```

## Environment Variables

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

## Key Behaviours
- `ON CONFLICT (url) DO NOTHING` — deduplicates articles automatically, safe to run frequently
- Full article content fetched via `trafilatura` with `favor_recall=True`; falls back to RSS `<description>` if extraction fails
- `published_at` parsed from `entry.published_parsed` (UTC struct_time) using `calendar.timegm` — not `time.mktime` which would misinterpret as local time
- `article_id` — populated from RSS `entry.id` or `entry.guid`, optional and not always present
- `feed_source` — plain text, no foreign key to a feeds table
- `word_count` — computed from extracted plain text before insert
- `summarised` flag — lets the AI summariser know which articles are pending
- Commit per feed, not once at the end — avoids losing all data on a single feed failure
- 0.5s sleep between articles to avoid hammering source servers

## Cron Schedule (Railway)
```
*/30 * * * *   # every 30 minutes
```

## Dependencies (requirements.txt)
```
feedparser==6.0.11
psycopg2-binary==2.9.10
python-dotenv==1.0.1
beautifulsoup4==4.12.3
requests==2.32.3
trafilatura==2.0.0
```

## Dockerfile
`Dockerfile_rss_fetcher`
