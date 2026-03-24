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

# ── Prompts ────────────────────────────────────────────────────────────────────

BGONAIR_PROMPT = """You are a Bulgarian news analyst summarising BGonAir articles. Write in Bulgarian.

Write a thorough digest using the following sections with markdown headers:

# Какво се случи вчера
A 2-3 paragraph high-level narrative of the day — what are the biggest stories, how do they connect, and why do they matter? Keep it brief and readable. Save the deep analysis for the sections below.

# Ключови теми
Group ALL stories into thematic clusters. Use ### subheadings for each theme (e.g. ### Политика, ### Икономика, ### Общество, ### Свят, ### Региони и тн.). For each theme write a substantive paragraph with the detail, numbers, and analysis. This is where the depth goes. Nothing important should be omitted. Do not repeat the overview — go deeper. Include regional news — stories from Bulgarian cities and regions are relevant even if not nationally significant. Skip celebrity gossip, traffic incidents, and purely trivial human-interest stories.

Write in Bulgarian — no English words except proper nouns and brand names. Use a clear, analytical tone. Flowing prose within each section, no bullet points."""

INVESTOR_PROMPT_WEEKDAY = """You are a financial and business news analyst summarising Investor.bg articles. Write in Bulgarian.

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

INVESTOR_PROMPT_WEEKEND = """You are a financial and business news analyst summarising Investor.bg articles. Write in Bulgarian.

Write a concise but informative digest using the following sections with markdown headers. Aim for brevity — every sentence should add new information. Avoid restating facts already mentioned in earlier sections.

# Какво се случи вчера
1-2 paragraphs with the narrative arc of the day — what happened and why it matters. This is a brief scene-setter, not a detailed analysis.

# Ключови теми
Group ALL stories into thematic clusters. Use ### subheadings for each theme (e.g. ### Енергетика, ### Банки и финанси, ### Компании, ### Макроикономика и тн.). For each theme write a substantive but tight paragraph — include key numbers and analysis, but cut filler and context the reader can infer. Strictly do not repeat information from the overview — only add new details, causes, and analysis. Nothing important should be omitted, but say it once.

Skip pure PR announcements and minor corporate filings with no broader market relevance.

Write in Bulgarian — no English words except proper nouns, brand names, and index codes. Use a clear, analytical tone. Flowing prose within each section, no bullet points."""

# ── Source configs ─────────────────────────────────────────────────────────────

SOURCES = [
    {
        "name": "bgonair",
        "feed_source": "BGonAir",
        "get_prompt": lambda is_weekday: BGONAIR_PROMPT,
        "webhook_env": "DISCORD_WEBHOOK_BGONAIR",
        "discord_label": lambda d: f"📰 BGonAir — Какво се случи на {d}",
        "color": 3066993,
    },
    {
        "name": "investor",
        "feed_source": "Investor",
        "get_prompt": lambda is_weekday: INVESTOR_PROMPT_WEEKDAY if is_weekday else INVESTOR_PROMPT_WEEKEND,
        "webhook_env": "DISCORD_WEBHOOK_INVESTOR",
        "discord_label": lambda d: f"📈 Investor.bg — Какво се случи на {d}",
        "color": 15844367,
    },
]

# ── Shared helpers ─────────────────────────────────────────────────────────────

def get_connection():
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set")
    return psycopg2.connect(url)


def fetch_articles(conn, feed_source, target_date):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, title, url, content
            FROM articles
            WHERE feed_source = %s
              AND DATE(published_at AT TIME ZONE 'Europe/Sofia') = %s
              AND word_count >= 50
            ORDER BY published_at DESC
        """, (feed_source, target_date))
        return cur.fetchall()


def build_articles_text(articles):
    lines = []
    for _, title, url, content in articles:
        lines.append(f"Title: {title}\nURL: {url}\nContent: {content}\n")
    return "\n---\n".join(lines)


def submit_batch(articles_text, target_date, source_name, system_prompt):
    batch = client.messages.batches.create(
        requests=[{
            "custom_id": f"{source_name}-digest-{target_date}",
            "params": {
                "model": "claude-sonnet-4-6",
                "max_tokens": 8192,
                "system": system_prompt,
                "messages": [{
                    "role": "user",
                    "content": f"Here are yesterday's articles ({target_date}):\n\n{articles_text}"
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


def send_to_discord(text, target_date, webhook_url, label_fn, color):
    date_label = target_date.strftime("%d.%m.%Y")
    sections = re.split(r'\n(?=# [^#])', text.strip())
    first = True

    for section in sections:
        lines = section.strip().split('\n', 1)
        if lines[0].startswith('# '):
            title = lines[0].lstrip('#').strip()
            body = lines[1].strip() if len(lines) > 1 else ''
        else:
            title = label_fn(date_label)
            body = lines[0].strip()

        if first:
            title = label_fn(date_label)
            first = False

        while body:
            chunk, body = body[:4096], body[4096:]
            requests.post(webhook_url, json={
                "embeds": [{"title": title, "description": chunk, "color": color}]
            }, timeout=10)
            title = f"{title} (продължение)"

# ── Per-source runner ──────────────────────────────────────────────────────────

def run_for_source(conn, source, target_date, is_weekday):
    name = source["name"]
    feed_source = source["feed_source"]
    log.info(f"Running summariser for {feed_source} ({target_date})")

    articles = fetch_articles(conn, feed_source, target_date)
    if not articles:
        log.info(f"No articles found for {feed_source} on {target_date}.")
        return

    log.info(f"Found {len(articles)} articles for {feed_source}")
    article_ids = [a[0] for a in articles]

    system_prompt = source["get_prompt"](is_weekday)
    batch_id = submit_batch(build_articles_text(articles), target_date, name, system_prompt)
    log.info(f"Batch submitted for {feed_source}: {batch_id}")

    digest = poll_batch(batch_id)
    if not digest:
        log.error(f"Batch failed or returned no results for {feed_source}.")
        return

    mark_summarised(conn, article_ids)
    conn.commit()

    webhook_url = os.getenv(source["webhook_env"])
    if not webhook_url:
        log.warning(f"{source['webhook_env']} not set, skipping Discord notification")
        return

    try:
        send_to_discord(digest, target_date, webhook_url, source["discord_label"], source["color"])
        log.info(f"Discord notification sent for {feed_source}")
    except Exception as e:
        log.error(f"Discord notification failed for {feed_source}: {e}")

# ── Entry point ────────────────────────────────────────────────────────────────

def run():
    yesterday = (datetime.now(SOFIA_TZ) - timedelta(days=1)).date()
    is_weekday = yesterday.weekday() < 5

    conn = get_connection()
    try:
        for source in SOURCES:
            run_for_source(conn, source, yesterday, is_weekday)
    finally:
        conn.close()


if __name__ == "__main__":
    run()