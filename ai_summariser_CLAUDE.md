# AI Summariser — CLAUDE.md

## Purpose
Two scripts fetch unsummarised articles from PostgreSQL, send them to Claude Sonnet 4.6 via the Batch API, and post the digest to Discord.

| Script | Runs | Target articles |
|--------|------|-----------------|
| `ai_summariser.py` | Daily cron | BGonAir + Investor.bg — previous day (both sources in one run) |
| `ai_summariser_investor_today.py` | On demand | Investor.bg — today |

## Stack
- Python 3.11+
- `anthropic` — Batch API
- `psycopg2-binary` — Postgres connection
- `python-dotenv` — env vars
- `requests` — Discord webhook

## Source Config (`ai_summariser.py`)

Each source is defined as a dict in the `SOURCES` list:

```python
{
    "name": str,               # used in batch custom_id
    "feed_source": str,        # matches articles.feed_source in DB
    "get_prompt": callable,    # fn(is_weekday: bool) -> str
    "webhook_env": str,        # env var name for the Discord webhook URL
    "discord_label": callable, # fn(date_str: str) -> str
    "color": int,              # Discord embed colour
}
```

Sources are processed sequentially. Each gets its own Batch API call, its own `mark_summarised` + commit, and its own Discord send — fully independent.

## Database Schema

```sql
-- Articles table defined in rss_fetcher_CLAUDE.md

CREATE TABLE digests (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    source TEXT NOT NULL,          -- 'bgonair' or 'investor'
    content TEXT NOT NULL,
    batch_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (date, source)
);
```

## Environment Variables

```env
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=your-anthropic-api-key
DISCORD_WEBHOOK_BGONAIR=https://discord.com/api/webhooks/...
DISCORD_WEBHOOK_INVESTOR=https://discord.com/api/webhooks/...
```

## Date Logic
- **Cron script**: targets `DATE(published_at AT TIME ZONE 'Europe/Sofia') = yesterday`
- **On-demand script**: targets today's date
- "Yesterday/today" resolved in Bulgarian time (`Europe/Sofia`, UTC+2/+3) at runtime
- Investor weekday/weekend determined by `yesterday.weekday() < 5`

## BGonAir — System Prompt
```
You are a Bulgarian news analyst summarising BGonAir articles. Write in Bulgarian.

# Какво се случи вчера
A 2-3 paragraph high-level narrative of the day — what are the biggest stories, how do they connect, and why do they matter?

# Ключови теми
Group ALL stories into thematic clusters. Use ### subheadings for each theme. Write substantive paragraphs with detail, numbers, and analysis. Include regional news. Skip celebrity gossip, traffic incidents, and purely trivial human-interest stories.

Write in Bulgarian — no English words except proper nouns and brand names. Flowing prose, no bullet points.
```

## Investor — System Prompt (weekday)
```
You are a financial and business news analyst summarising Investor.bg articles. Write in Bulgarian.

# Какво се случи вчера
A 2-3 paragraph high-level narrative of the day.

# Пазари
**Азия** / **Европа** / **САЩ** — key indices, performance, main drivers.

# Ключови теми
Group ALL stories into thematic clusters. Use ### subheadings. Write substantive paragraphs with detail, numbers, and analysis. Skip pure PR announcements and minor corporate filings.

Write in Bulgarian — no English words except proper nouns, brand names, and index codes. Flowing prose, no bullet points.
```

On **weekends** the `# Пазари` section is omitted from the prompt.

## Discord Format
Each source posts to its own webhook. The digest is split on top-level `#` headers; each section becomes a separate embed. Bodies longer than 4096 characters are chunked with `(продължение)` appended to the title.

## Cron Schedule (Railway)
```
0 8 * * *   # every day at 8am Bulgarian time
```

## Key Behaviours
- Filters by `feed_source` so each source only processes its own articles
- Polls Batch API every 60s — typically resolves in 1–10 minutes
- `mark_summarised` + `conn.commit()` called per source after successful digest — a failure on one source does not affect the other
- Discord errors are logged but do not fail the run

## Dependencies (requirements.summariser.txt)
```
anthropic==0.49.0
psycopg2-binary==2.9.10
python-dotenv==1.0.1
requests==2.32.3
```

## Dockerfiles
- `Dockerfile_summariser` — runs `ai_summariser.py`
- `Dockerfile_summariser_investor_today`