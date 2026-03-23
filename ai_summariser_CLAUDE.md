# AI Summariser — CLAUDE.md

## Purpose
Three scripts fetch unsummarised articles from PostgreSQL, send them to Claude Sonnet 4.6 via the Batch API, store the digest, and post it to Discord.

| Script | Runs | Target articles |
|--------|------|-----------------|
| `ai_summariser_bgonair.py` | Daily cron | BGonAir — previous day |
| `ai_summariser_investor.py` | Daily cron | Investor.bg — previous day |
| `ai_summariser_investor_today.py` | On demand | Investor.bg — today |

## Stack
- Python 3.11+
- `anthropic` — Batch API
- `psycopg2-binary` — Postgres connection
- `python-dotenv` — env vars
- `requests` — Discord webhook

## Database Schema

```sql
-- Articles table defined in rss_fetcher_CLAUDE.md

CREATE TABLE digests (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    source TEXT NOT NULL,          -- 'bgonair' or 'investor'
    content TEXT NOT NULL,         -- raw JSON from Claude
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
- **Cron scripts**: target `DATE(published_at AT TIME ZONE 'Europe/Sofia') = yesterday`
- **On-demand script**: targets today's date
- "Yesterday/today" resolved in Bulgarian time (`Europe/Sofia`, UTC+2/+3) at runtime

## BGonAir — System Prompt
```
You are a Bulgarian news analyst summarising BGonAir articles. Write in Bulgarian.

Write a thorough digest using the following sections with markdown headers:

# Какво се случи вчера
A 2-3 paragraph high-level narrative of the day — what are the biggest stories, how do they connect, and why do they matter? Keep it brief and readable. Save the deep analysis for the sections below.

# Ключови теми
Group ALL stories into thematic clusters. Use ### subheadings for each theme (e.g. ### Политика, ### Икономика, ### Общество, ### Свят, ### Региони и тн.). For each theme write a substantive paragraph with the detail, numbers, and analysis. This is where the depth goes. Nothing important should be omitted. Do not repeat the overview — go deeper. Include regional news — stories from Bulgarian cities and regions are relevant even if not nationally significant. Skip celebrity gossip, traffic incidents, and purely trivial human-interest stories.

Write in Bulgarian — no English words except proper nouns and brand names. Use a clear, analytical tone. Flowing prose within each section, no bullet points.
```

## Investor — System Prompt (weekday)
```
You are a financial and business news analyst summarising Investor.bg articles from the previous day.

Your job:
1. For each significant article write a 2-3 sentence summary explaining what happened and why it matters
2. Write a "What happened yesterday" overview (2-3 paragraphs) covering key developments and their significance
3. Write a dedicated "Markets" section covering:
   - Asian markets: overall performance and key drivers
   - European markets: overall performance and key drivers
   - US markets: overall performance and key drivers

Format your response as JSON:
{
  "overview": "...",
  "markets": {"asia": "...", "europe": "...", "us": "..."},
  "articles": [{"title": "...", "url": "...", "summary": "..."}]
}

Return only valid JSON. No preamble, no markdown fences.
```

On **weekends** the markets section is omitted from both the prompt and the JSON format.

## Discord Format
Each script sends to its own webhook:
1. **Overview embed** — title + overview paragraph
2. **Markets embed** (Investor weekdays only) — Asia / Europe / US sections
3. **Per-article messages** — bold title, summary, URL

## Cron Schedule (Railway)
```
0 8 * * *   # every day at 8am Bulgarian time
```

## Key Behaviours
- Filters by `feed_source` so each script only processes its own articles
- `summarised = FALSE` filter prevents reprocessing; set to `TRUE` only after successful digest save
- Polls Batch API every 60s — typically resolves in 1–10 minutes
- `ON CONFLICT (date, source) DO UPDATE` — safe to re-run on failure
- `json.loads` wrapped in try/except — logs raw response on parse failure
- Discord errors are logged but do not fail the run (digest already saved to DB)

## Dependencies (requirements.summariser.txt)
```
anthropic==0.49.0
psycopg2-binary==2.9.10
python-dotenv==1.0.1
requests==2.32.3
```

## Dockerfiles
- `Dockerfile_summariser_bgonair`
- `Dockerfile_summariser_investor`
- `Dockerfile_summariser_investor_today`
