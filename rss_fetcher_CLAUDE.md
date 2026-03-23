# RSS Feed Fetcher — CLAUDE.md

## Purpose
Fetch articles from RSS feeds and store them in a PostgreSQL database. Runs as a scheduled cron job.

## Stack
- Python 3.11+
- `feedparser` — RSS parsing
- `psycopg2` — Postgres connection
- `python-dotenv` — env vars

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
DATABASE_URL=postgresql://postgres:ztsvFmFivHRwlFekQylopCVOLbfikotV@postgres.railway.internal:5432/railway
POSTGRES_DB=railway
POSTGRES_PASSWORD=ztsvFmFivHRwlFekQylopCVOLbfikotV
```

## Core Logic

```python
import feedparser
import psycopg2
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

FEEDS = [
    {"name": "TechCrunch", "url": "https://techcrunch.com/feed/"},
    {"name": "Hacker News", "url": "https://news.ycombinator.com/rss"},
    # add more feeds here
]

def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

def insert_article(conn, feed_name, entry):
    content = entry.get("summary", "")
    word_count = len(content.split()) if content else 0
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO articles (article_id, feed_source, title, url, content, word_count, published_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (url) DO NOTHING
        """, (
            entry.get("id") or entry.get("guid"),
            feed_name,
            entry.get("title", ""),
            entry.get("link", ""),
            content,
            word_count,
            entry.get("published", datetime.utcnow())
        ))

def fetch_and_store():
    conn = get_connection()
    total = 0
    try:
        for feed_config in FEEDS:
            try:
                feed = feedparser.parse(feed_config["url"])
                for entry in feed.entries:
                    insert_article(conn, feed_config["name"], entry)
                    total += 1
                conn.commit()
                print(f"Fetched {len(feed.entries)} articles from {feed_config['name']}")
            except Exception as e:
                print(f"Failed to fetch {feed_config['url']}: {e}")
                conn.rollback()
        print(f"Done. Total articles processed: {total}")
    finally:
        conn.close()

if __name__ == "__main__":
    fetch_and_store()
```

## Cron Schedule (Railway)
```
0 * * * *   # every hour
```
Or every 30 minutes:
```
*/30 * * * *
```

## Key Behaviours
- `ON CONFLICT (url) DO NOTHING` — deduplicates articles automatically, safe to run frequently
- `article_id` — populated from RSS `entry.id` or `entry.guid`, optional and not always present
- `feed_source` — plain text, no foreign key to a feeds table, keeps schema simple
- `word_count` — computed in Python before insert (`len(content.split())`)
- `summarised` flag — lets the AI summariser know which articles are pending
- Store `content` as plain text, not HTML — strip tags with BeautifulSoup if needed
- Do not store images in the DB — reference URLs only
- Commit per feed, not once at the end — avoids losing all data on a single feed failure

## Dependencies (requirements.txt)
```
feedparser==6.0.11
psycopg2-binary==2.9.9
python-dotenv==1.0.1
```
