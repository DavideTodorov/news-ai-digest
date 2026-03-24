import anthropic
import psycopg2
import requests
import re
import os
import time
import logging
from datetime import timedelta, datetime
from zoneinfo import ZoneInfo
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

SOFIA_TZ = ZoneInfo("Europe/Sofia")
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """You are a Bulgarian news analyst summarising BGonAir articles. Write in Bulgarian.

Write a concise but informative digest using the following sections with markdown headers. Aim for brevity — every sentence should add new information. Avoid restating facts already mentioned in earlier sections.

# Какво се случи вчера
1-2 paragraphs with the narrative arc of the day — what are the biggest stories, how do they connect, and why do they matter? This is a brief scene-setter, not a detailed analysis.

# Ключови теми
Group ALL stories into thematic clusters. Use ### subheadings for each theme (e.g. ### Политика, ### Икономика, ### Общество, ### Свят, ### Региони и тн.). For each theme write a substantive but tight paragraph — include key details, numbers, and analysis, but cut filler and context the reader can infer. Strictly do not repeat information from the overview — only add new details and analysis. Nothing important should be omitted, but say it once. Include regional news — stories from Bulgarian cities and regions are relevant even if not nationally significant. Skip celebrity gossip, traffic incidents, and purely trivial human-interest stories.

Write in Bulgarian — no English words except proper nouns and brand names. Use a clear, analytical tone. Flowing prose within each section, no bullet points."""


def get_connection():
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set")
    return psycopg2.connect(url)


def fetch_articles(conn, target_date):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, title, url, content
            FROM articles
            WHERE feed_source = 'BGonAir'
              AND DATE(published_at AT TIME ZONE 'Europe/Sofia') = %s
              AND word_count >= 50
            ORDER BY published_at DESC
        """, (target_date,))
        return cur.fetchall()


def build_articles_text(articles):
    lines = []
    for _, title, url, content in articles:
        lines.append(f"Title: {title}\nURL: {url}\nContent: {content}\n")
    return "\n---\n".join(lines)


def submit_batch(articles_text, target_date):
    batch = client.messages.batches.create(
        requests=[{
            "custom_id": f"bgonair-digest-{target_date}",
            "params": {
                "model": "claude-sonnet-4-6",
                "max_tokens": 8192,
                "system": SYSTEM_PROMPT,
                "messages": [{
                    "role": "user",
                    "content": f"Here are yesterday's BGonAir articles ({target_date}):\n\n{articles_text}"
                }]
            }
        }]
    )
    return batch.id


def poll_batch(batch_id, interval=60):
    while True:
        batch = client.messages.batches.retrieve(batch_id)
        if batch.processing_status == "ended":
            break
        log.info(f"Batch still processing... retrying in {interval}s")
        time.sleep(interval)

    for result in client.messages.batches.results(batch_id):
        if result.result.type == "succeeded":
            return result.result.message.content[0].text
    return None


def mark_summarised(conn, article_ids):
    with conn.cursor() as cur:
        cur.execute("UPDATE articles SET summarised = TRUE WHERE id = ANY(%s)", (article_ids,))


def send_to_discord(text, target_date):
    webhook_url = os.getenv("DISCORD_WEBHOOK_BGONAIR")
    if not webhook_url:
        log.warning("DISCORD_WEBHOOK_BGONAIR not set, skipping Discord notification")
        return

    date_label = target_date.strftime("%d.%m.%Y")
    sections = re.split(r'\n(?=# [^#])', text.strip())
    first = True

    for section in sections:
        lines = section.strip().split('\n', 1)
        if lines[0].startswith('# '):
            title = lines[0].lstrip('#').strip()
            body = lines[1].strip() if len(lines) > 1 else ''
        else:
            title = f"📰 BGonAir — Какво се случи на {date_label}"
            body = lines[0].strip()

        if first:
            title = f"📰 BGonAir — Какво се случи на {date_label}"
            first = False

        while body:
            chunk, body = body[:4096], body[4096:]
            requests.post(webhook_url, json={
                "embeds": [{"title": title, "description": chunk, "color": 3066993}]
            }, timeout=10)
            title = f"{title} (продължение)"


def run():
    yesterday = (datetime.now(SOFIA_TZ) - timedelta(days=1)).date()
    log.info(f"Running BGonAir summariser for {yesterday}")

    conn = get_connection()
    try:
        articles = fetch_articles(conn, yesterday)
        if not articles:
            log.info("No articles found for yesterday.")
            return

        log.info(f"Found {len(articles)} articles to summarise")
        article_ids = [a[0] for a in articles]

        batch_id = submit_batch(build_articles_text(articles), yesterday)
        log.info(f"Batch submitted: {batch_id}")

        digest = poll_batch(batch_id)
        if not digest:
            log.error("Batch failed or returned no results.")
            return

        mark_summarised(conn, article_ids)
        conn.commit()

        try:
            send_to_discord(digest, yesterday)
            log.info("Discord notification sent")
        except Exception as e:
            log.error(f"Discord notification failed: {e}")

    finally:
        conn.close()


if __name__ == "__main__":
    run()
