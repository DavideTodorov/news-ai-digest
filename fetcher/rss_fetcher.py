import feedparser
import psycopg2
import requests
import trafilatura
import os
import logging
from calendar import timegm
from datetime import datetime, timezone
from time import sleep
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)

FEEDS = [
    {"name": "BGonAir", "url": "https://www.bgonair.bg/rss/c/2-bulgaria"},
    {"name": "Investor", "url": "https://www.investor.bg/rss/c/578-top-novini"},
]

HEADERS = {"User-Agent": "Mozilla/5.0"}


def get_connection():
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set")
    log.info(f"Connecting to DB: {url[:30]}...")
    return psycopg2.connect(url)


def strip_html(text):
    if not text:
        return ""
    return BeautifulSoup(text, "html.parser").get_text(separator=" ").strip()


def parse_published(entry):
    if hasattr(entry, "published_parsed") and entry.published_parsed:
        return datetime.fromtimestamp(timegm(entry.published_parsed), tz=timezone.utc)
    return datetime.now(tz=timezone.utc)


def fetch_article_content(url):
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        html = r.content.decode(r.apparent_encoding or "utf-8", errors="replace")
        text = trafilatura.extract(html, favor_recall=True)
        return text or ""
    except Exception as e:
        log.warning(f"Could not fetch content for {url}: {e}")
        return ""


def insert_article(conn, feed_name, entry):
    url = entry.get("link", "")
    title = entry.get("title", "")
    log.info(f"Processing: {title[:60]}")
    content = fetch_article_content(url)
    if not content:
        log.warning(f"Falling back to RSS summary for: {url}")
        content = strip_html(entry.get("summary", ""))
    word_count = len(content.split()) if content else 0
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO articles (article_id, feed_source, title, url, content, word_count, published_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (url) DO UPDATE SET
                title = EXCLUDED.title,
                content = EXCLUDED.content,
                word_count = EXCLUDED.word_count
            """,
            (
                entry.get("id") or entry.get("guid"),
                feed_name,
                title,
                url,
                content,
                word_count,
                parse_published(entry),
            ),
        )


def fetch_and_store():
    log.info("Starting fetch_and_store")
    conn = get_connection()
    total = 0
    try:
        for feed_config in FEEDS:
            log.info(f"Fetching feed: {feed_config['name']}")
            try:
                feed = feedparser.parse(feed_config["url"])
                log.info(f"Found {len(feed.entries)} entries in {feed_config['name']}")
                for entry in feed.entries:
                    insert_article(conn, feed_config["name"], entry)
                    total += 1
                    sleep(0.5)
                conn.commit()
                log.info(f"Committed {len(feed.entries)} articles from {feed_config['name']}")
            except Exception as e:
                log.error(f"Failed to process feed {feed_config['name']}: {e}")
                conn.rollback()
        log.info(f"Done. Total articles processed: {total}")
    finally:
        conn.close()


if __name__ == "__main__":
    fetch_and_store()
