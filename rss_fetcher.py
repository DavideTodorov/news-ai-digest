import feedparser
import psycopg2
import requests
import trafilatura
import os
from datetime import datetime, timezone
from time import mktime, sleep
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

FEEDS = [
    {"name": "BNT News", "url": "https://news.bnt.bg/bg/rss/news.xml"},
    {"name": "Investor.bg Top News", "url": "https://www.investor.bg/rss/c/578-top-novini"},
]

HEADERS = {"User-Agent": "Mozilla/5.0"}


def get_connection():
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set")
    return psycopg2.connect(url)


def strip_html(text):
    if not text:
        return ""
    return BeautifulSoup(text, "html.parser").get_text(separator=" ").strip()


def parse_published(entry):
    if hasattr(entry, "published_parsed") and entry.published_parsed:
        return datetime.fromtimestamp(mktime(entry.published_parsed), tz=timezone.utc)
    return datetime.now(tz=timezone.utc)


def fetch_article_content(url):
    """Fetch full article text. Falls back to empty string on failure."""
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        html = r.content.decode("utf-8")
        text = trafilatura.extract(html, favor_recall=True)
        return text or ""
    except Exception as e:
        print(f"  Could not fetch content for {url}: {e}")
        return ""


def insert_article(conn, feed_name, entry):
    url = entry.get("link", "")
    content = fetch_article_content(url)
    if not content:
        content = strip_html(entry.get("summary", ""))
    word_count = len(content.split()) if content else 0
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO articles (article_id, feed_source, title, url, content, word_count, published_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (url) DO NOTHING
            """,
            (
                entry.get("id") or entry.get("guid"),
                feed_name,
                entry.get("title", ""),
                url,
                content,
                word_count,
                parse_published(entry),
            ),
        )


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
                    sleep(0.5)
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
