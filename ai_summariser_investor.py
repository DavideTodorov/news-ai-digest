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

SYSTEM_PROMPT_WEEKDAY = """You are a financial and business news analyst summarising Investor.bg articles. Write in Bulgarian.

Write a concise but informative digest using the following sections with markdown headers. Aim for brevity — every sentence should add new information. Avoid restating facts already mentioned in earlier sections.

# Какво се случи вчера
1-2 paragraphs with the narrative arc of the day — what happened, what moved markets, and why it matters. This is a brief scene-setter, not a detailed analysis.

# Пазари
Cover market movements with context:
**Азия** — key indices, performance, main drivers
**Европа** — key indices, performance, main drivers
**САЩ** — futures or close, main drivers, sector moves

# Ключови теми
Group ALL stories into thematic clusters. Use ### subheadings for each theme (e.g. ### Енергетика, ### Банки и финанси, ### Компании, ### Макроикономика и тн.). For each theme write a substantive but tight paragraph — include key numbers and analysis, but cut filler and context the reader can infer. Strictly do not repeat information from the overview or markets sections — only add new details, causes, and analysis. Nothing important should be omitted, but say it once.

Skip pure PR announcements and minor corporate filings with no broader market relevance.

Write in Bulgarian — no English words except proper nouns, brand names, and index codes. Use a clear, analytical tone. Flowing prose within each section, no bullet points."""

SYSTEM_PROMPT_WEEKEND = """You are a financial and business news analyst summarising Investor.bg articles. Write in Bulgarian.

Write a concise but informative digest using the following sections with markdown headers. Aim for brevity — every sentence should add new information. Avoid restating facts already mentioned in earlier sections.

# Какво се случи вчера
1-2 paragraphs with the narrative arc of the day — what happened and why it matters. This is a brief scene-setter, not a detailed analysis.

# Ключови теми
Group ALL stories into thematic clusters. Use ### subheadings for each theme (e.g. ### Енергетика, ### Банки и финанси, ### Компании, ### Макроикономика и тн.). For each theme write a substantive but tight paragraph — include key numbers and analysis, but cut filler and context the reader can infer. Strictly do not repeat information from the overview — only add new details, causes, and analysis. Nothing important should be omitted, but say it once.

Skip pure PR announcements and minor corporate filings with no broader market relevance.

Write in Bulgarian — no English words except proper nouns, brand names, and index codes. Use a clear, analytical tone. Flowing prose within each section, no bullet points."""


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
            WHERE feed_source = 'Investor'
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
            "custom_id": f"investor-digest-{target_date}",
            "params": {
                "model": "claude-sonnet-4-6",
                "max_tokens": 8192,
                "system": system_prompt,
                "messages": [{
                    "role": "user",
                    "content": f"Here are yesterday's Investor.bg articles ({target_date}):\n\n{articles_text}"
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
    webhook_url = os.getenv("DISCORD_WEBHOOK_INVESTOR")
    if not webhook_url:
        log.warning("DISCORD_WEBHOOK_INVESTOR not set, skipping Discord notification")
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
            title = f"📈 Investor.bg — Какво се случи на {date_label}"
            body = lines[0].strip()

        if first:
            title = f"📈 Investor.bg — Какво се случи на {date_label}"
            first = False

        while body:
            chunk, body = body[:4096], body[4096:]
            requests.post(webhook_url, json={
                "embeds": [{"title": title, "description": chunk, "color": 15844367}]
            }, timeout=10)
            title = f"{title} (продължение)"


def run():
    yesterday = (datetime.now(SOFIA_TZ) - timedelta(days=1)).date()
    is_weekday = yesterday.weekday() < 5
    log.info(f"Running Investor summariser for {yesterday} (weekday={is_weekday})")

    conn = get_connection()
    try:
        articles = fetch_articles(conn, yesterday)
        if not articles:
            log.info("No articles found for yesterday.")
            return

        log.info(f"Found {len(articles)} articles to summarise")
        article_ids = [a[0] for a in articles]

        batch_id = submit_batch(build_articles_text(articles), yesterday, is_weekday)
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
