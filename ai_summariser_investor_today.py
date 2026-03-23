import anthropic
import psycopg2
import requests
import re
import os
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

SYSTEM_PROMPT_WEEKDAY = """You are a financial and business news analyst summarising Investor.bg articles. Write in Bulgarian.

Write a thorough digest using the following sections with markdown headers:

# Какво се случи днес
A 2-3 paragraph high-level narrative of the day — what are the biggest stories, how do they connect, and why do they matter? Keep it brief and readable. Save the deep analysis for the sections below.

# Пазари
Cover market movements with context:
**Азия** — key indices, performance, main drivers
**Европа** — key indices, performance, main drivers
**САЩ** — pre-market or intraday levels, main drivers, sector moves

# Ключови теми
Group ALL stories into thematic clusters. Use ### subheadings for each theme (e.g. ### Енергетика, ### Банки и финанси, ### Компании, ### Макроикономика и тн.). For each theme write a substantive paragraph with the detail, numbers, and analysis. This is where the depth goes. Nothing important should be omitted. Do not repeat the overview — go deeper.

Skip pure PR announcements and minor corporate filings with no broader market relevance.

Write in a clear, analytical tone. Flowing prose within each section, no bullet points."""

SYSTEM_PROMPT_WEEKEND = """You are a financial and business news analyst summarising Investor.bg articles. Write in Bulgarian.

Write a thorough digest using the following sections with markdown headers:

# Какво се случи днес
A 2-3 paragraph high-level narrative of the day — what are the biggest stories, how do they connect, and why do they matter? Keep it brief and readable. Save the deep analysis for the sections below.

# Ключови теми
Group ALL stories into thematic clusters. Use ### subheadings for each theme (e.g. ### Енергетика, ### Банки и финанси, ### Компании, ### Макроикономика и тн.). For each theme write a substantive paragraph with the detail, numbers, and analysis. This is where the depth goes. Nothing important should be omitted. Do not repeat the overview — go deeper.

Skip pure PR announcements and minor corporate filings with no broader market relevance.

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
            WHERE feed_source = 'Investor.bg Top News'
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


def submit_batch(articles_text, target_date, is_weekday):
    system_prompt = SYSTEM_PROMPT_WEEKDAY if is_weekday else SYSTEM_PROMPT_WEEKEND
    batch = client.messages.batches.create(
        requests=[{
            "custom_id": f"investor-digest-today-{target_date}",
            "params": {
                "model": "claude-sonnet-4-6",
                "max_tokens": 8192,
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


def send_to_discord(text, target_date):
    webhook_url = os.getenv("DISCORD_WEBHOOK_INVESTOR")
    if not webhook_url:
        log.warning("DISCORD_WEBHOOK_INVESTOR not set, skipping Discord notification")
        return

    now = datetime.now(SOFIA_TZ)
    date_label = target_date.strftime("%d.%m.%Y")
    time_label = now.strftime("%H:%M")
    sections = re.split(r'\n(?=# [^#])', text.strip())
    first = True

    for section in sections:
        lines = section.strip().split('\n', 1)
        if lines[0].startswith('# '):
            title = lines[0].lstrip('#').strip()
            body = lines[1].strip() if len(lines) > 1 else ''
        else:
            title = f"📈 Investor.bg — Какво се случи на {date_label} ({time_label})"
            body = lines[0].strip()

        if first:
            title = f"📈 Investor.bg — Какво се случи на {date_label} ({time_label})"
            first = False

        while body:
            chunk, body = body[:4096], body[4096:]
            requests.post(webhook_url, json={
                "embeds": [{"title": title, "description": chunk, "color": 15844367}]
            }, timeout=10)
            title = f"{title} (продължение)"


def run():
    today = datetime.now(SOFIA_TZ).date()
    is_weekday = today.weekday() < 5
    log.info(f"Running Investor summariser for today {today} (weekday={is_weekday})")

    conn = get_connection()
    try:
        articles = fetch_articles(conn, today)
        if not articles:
            log.info("No articles found for today.")
            return

        log.info(f"Found {len(articles)} articles to summarise")

        batch_id = submit_batch(build_articles_text(articles), today, is_weekday)
        log.info(f"Batch submitted: {batch_id}")

        digest = poll_batch(batch_id)
        if not digest:
            log.error("Batch failed or returned no results.")
            return

        try:
            send_to_discord(digest, today)
            log.info("Discord notification sent")
        except Exception as e:
            log.error(f"Discord notification failed: {e}")

    finally:
        conn.close()


if __name__ == "__main__":
    run()
