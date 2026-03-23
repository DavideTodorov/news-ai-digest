import anthropic
import psycopg2
import requests
import os
import json
import time
import logging
from datetime import datetime
from zoneinfo import ZoneInfo
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

SOFIA_TZ = ZoneInfo("Europe/Sofia")
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT_WEEKDAY = """You are a financial and business news analyst summarising Investor.bg articles from today.

Your job:
1. For each significant article write a 2-3 sentence summary explaining what happened and why it matters
2. Write a "What happened today" overview (2-3 paragraphs) covering key developments and their significance
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

Return only valid JSON. No preamble, no markdown fences."""

SYSTEM_PROMPT_WEEKEND = """You are a financial and business news analyst summarising Investor.bg articles from today.

Your job:
1. For each significant article write a 2-3 sentence summary explaining what happened and why it matters
2. Write a "What happened today" overview (2-3 paragraphs) covering key developments and their significance

Format your response as JSON:
{
  "overview": "...",
  "articles": [{"title": "...", "url": "...", "summary": "..."}]
}

Return only valid JSON. No preamble, no markdown fences."""


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
            WHERE feed_source = 'Investor.bg Top News'
              AND summarised = FALSE
              AND DATE(published_at AT TIME ZONE 'Europe/Sofia') = %s
            ORDER BY published_at DESC
        """, (target_date,))
        return cur.fetchall()


def build_articles_text(articles):
    lines = []
    for _, title, url, content in articles:
        lines.append(f"Title: {title}\nURL: {url}\nContent: {content[:800]}\n")
    return "\n---\n".join(lines)


def submit_batch(articles_text, target_date, is_weekday):
    system_prompt = SYSTEM_PROMPT_WEEKDAY if is_weekday else SYSTEM_PROMPT_WEEKEND
    batch = client.messages.batches.create(
        requests=[{
            "custom_id": f"investor-digest-today-{target_date}",
            "params": {
                "model": "claude-sonnet-4-6",
                "max_tokens": 4096,
                "system": system_prompt,
                "messages": [{
                    "role": "user",
                    "content": f"Here are today's Investor.bg articles ({target_date}):\n\n{articles_text}"
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


def save_digest(conn, batch_id, content, target_date):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO digests (date, source, content, batch_id)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (date, source) DO UPDATE SET content = EXCLUDED.content
        """, (target_date, "investor", content, batch_id))


def mark_summarised(conn, article_ids):
    with conn.cursor() as cur:
        cur.execute("UPDATE articles SET summarised = TRUE WHERE id = ANY(%s)", (article_ids,))


def send_to_discord(digest, target_date, is_weekday):
    webhook_url = os.getenv("DISCORD_WEBHOOK_INVESTOR")
    if not webhook_url:
        log.warning("DISCORD_WEBHOOK_INVESTOR not set, skipping Discord notification")
        return

    date_label = target_date.strftime("%d %b %Y")

    requests.post(webhook_url, json={
        "embeds": [{
            "title": f"📈 Investor.bg Digest — {date_label}",
            "description": digest.get("overview", "")[:4096],
            "color": 15844367
        }]
    }, timeout=10)

    if is_weekday and "markets" in digest:
        m = digest["markets"]
        markets_text = (
            f"**🌏 Asia**\n{m.get('asia', '')}\n\n"
            f"**🌍 Europe**\n{m.get('europe', '')}\n\n"
            f"**🌎 US**\n{m.get('us', '')}"
        )
        requests.post(webhook_url, json={
            "embeds": [{
                "title": "Markets",
                "description": markets_text[:4096],
                "color": 15844367
            }]
        }, timeout=10)

    for article in digest.get("articles", []):
        text = f"**{article['title']}**\n{article['summary']}\n<{article['url']}>"
        if len(text) <= 2000:
            requests.post(webhook_url, json={"content": text}, timeout=10)


def run():
    today = datetime.now(SOFIA_TZ).date()
    is_weekday = today.weekday() < 5
    log.info(f"Running Investor summariser for today {today} (weekday={is_weekday})")

    conn = get_connection()
    try:
        articles = fetch_articles(conn, today)
        if not articles:
            log.info("No unsummarised Investor articles for today.")
            return

        log.info(f"Found {len(articles)} articles to summarise")
        article_ids = [a[0] for a in articles]

        batch_id = submit_batch(build_articles_text(articles), today, is_weekday)
        log.info(f"Batch submitted: {batch_id}")

        raw = poll_batch(batch_id)
        if not raw:
            log.error("Batch failed or returned no results.")
            return

        try:
            digest = json.loads(raw)
        except json.JSONDecodeError as e:
            log.error(f"Failed to parse Claude response as JSON: {e}")
            log.error(f"Raw response: {raw[:500]}")
            return

        save_digest(conn, batch_id, json.dumps(digest, ensure_ascii=False), today)
        mark_summarised(conn, article_ids)
        conn.commit()
        log.info(f"Digest saved for {today}")

        try:
            send_to_discord(digest, today, is_weekday)
            log.info("Discord notification sent")
        except Exception as e:
            log.error(f"Discord notification failed: {e}")

    finally:
        conn.close()


if __name__ == "__main__":
    run()
