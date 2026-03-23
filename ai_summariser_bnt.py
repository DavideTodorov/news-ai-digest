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

SYSTEM_PROMPT = """You are a Bulgarian news analyst summarising BNT News articles. Write in Bulgarian.

Write a thorough digest using the following sections with markdown headers:

# Какво се случи вчера
A 2-3 paragraph high-level narrative of the day — what are the biggest stories, how do they connect, and why do they matter? Keep it brief and readable. Save the deep analysis for the sections below.

# Ключови теми
Group ALL stories into thematic clusters. Use ### subheadings for each theme (e.g. ### Политика, ### Икономика, ### Общество, ### Свят, ### Региони и тн.). For each theme write a substantive paragraph with the detail, numbers, and analysis. This is where the depth goes. Nothing important should be omitted. Do not repeat the overview — go deeper. Include regional news — stories from Bulgarian cities and regions are relevant even if not nationally significant. Skip celebrity gossip, traffic incidents, and purely trivial human-interest stories.

Write in a clear, analytical tone. Flowing prose within each section, no bullet points."""


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
            WHERE feed_source = 'BNT News'
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
            "custom_id": f"bnt-digest-{target_date}",
            "params": {
                "model": "claude-sonnet-4-6",
                "max_tokens": 8192,
                "system": SYSTEM_PROMPT,
                "messages": [{
                    "role": "user",
                    "content": f"Here are yesterday's BNT News articles ({target_date}):\n\n{articles_text}"
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
    webhook_url = os.getenv("DISCORD_WEBHOOK_BNT")
    if not webhook_url:
        log.warning("DISCORD_WEBHOOK_BNT not set, skipping Discord notification")
        return

    date_label = target_date.strftime("%d %b %Y")
    sections = re.split(r'\n(?=#)', text.strip())
    first = True

    for section in sections:
        lines = section.strip().split('\n', 1)
        if lines[0].startswith('#'):
            title = lines[0][3:].strip()
            body = lines[1].strip() if len(lines) > 1 else ''
        else:
            title = f"📰 BNT Digest — {date_label}"
            body = lines[0].strip()

        if first:
            title = f"📰 BNT — {date_label} — {title}" if not title.startswith('📰') else title
            first = False

        while body:
            chunk, body = body[:4096], body[4096:]
            requests.post(webhook_url, json={
                "embeds": [{"title": title, "description": chunk, "color": 3066993}]
            }, timeout=10)
            title = f"{title} (продължение)"


def run():
    yesterday = (datetime.now(SOFIA_TZ) - timedelta(days=1)).date()
    log.info(f"Running BNT summariser for {yesterday}")

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
