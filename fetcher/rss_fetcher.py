import feedparser
import psycopg2
import requests
import trafilatura
import os
import re
import logging
from calendar import timegm
from contextlib import contextmanager
from datetime import datetime, timezone
from time import sleep
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)

# Keep in sync with the word_count filter in summariser/lib/db.py — below this
# an article never reaches the digest, so it is worth a warning.
MIN_CONTENT_WORDS = 50

# Mediapool renders tag lists, donation appeals, forum rules and reader comments
# inside the article body. Everything from a "tail" line onward is boilerplate;
# "drop" lines head a related-links block sitting mid-article. Scoped to this
# feed on purpose — the phrasing is generic enough to appear on other sites.
MEDIAPOOL_CONTENT_FILTERS = {
    "tail": [
        re.compile(p)
        for p in (
            r"^Ключови думи$",
            r"^Свободата има цена$",
            r"^Подкрепете ни$",
            r"^\d+\s+коментар",
            r"^Екипът на Mediapool",
            r"^Прочетете нашите правила",
        )
    ],
    "drop": [re.compile(r"^Още по темата$")],
}

FEEDS = [
    {
        "name": "Mediapool",
        "url": "https://www.mediapool.bg/rss",
        "exclude_categories": {"Анализи и Коментари"},
        # Mediapool keeps reader comments in the body block; Investor loses real
        # article text when trafilatura's comment detection is turned off.
        "extract_opts": {"favor_recall": True, "include_comments": False},
        "content_filters": MEDIAPOOL_CONTENT_FILTERS,
    },
    {
        "name": "Investor",
        "url": "https://www.investor.bg/rss/c/578-top-novini",
        "extract_opts": {"favor_recall": True},
    },
]

HEADERS = {"User-Agent": "Mozilla/5.0"}


def get_connection():
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set")
    log.info(f"Connecting to DB: {url[:30]}...")
    return psycopg2.connect(url)


@contextmanager
def savepoint(conn, name="article_sp"):
    """Isolate one statement so its failure can't roll back the whole feed."""
    with conn.cursor() as cur:
        cur.execute(f"SAVEPOINT {name}")
    try:
        yield
    except Exception:
        with conn.cursor() as cur:
            cur.execute(f"ROLLBACK TO SAVEPOINT {name}")
        raise
    else:
        with conn.cursor() as cur:
            cur.execute(f"RELEASE SAVEPOINT {name}")


def clean_content(text, filters=None):
    if not text:
        return ""
    if not filters:
        return text.strip()
    tail = filters.get("tail", ())
    drop = filters.get("drop", ())
    lines = []
    for line in text.split("\n"):
        stripped = line.strip()
        if any(p.match(stripped) for p in tail):
            break
        if any(p.match(stripped) for p in drop):
            continue
        lines.append(line)
    return "\n".join(lines).strip()


def entry_categories(entry):
    return {t.get("term", "").strip().casefold() for t in entry.get("tags", []) if t.get("term")}


def parse_published(entry):
    if hasattr(entry, "published_parsed") and entry.published_parsed:
        return datetime.fromtimestamp(timegm(entry.published_parsed), tz=timezone.utc)
    return datetime.now(tz=timezone.utc)


def extraction_attempts(opts):
    """Primary settings first, then variants that keep the feed's comment
    handling but change how aggressively trafilatura selects the body. Retries
    recover the full article or nothing — they never yield partial text."""
    yield opts
    base = {k: v for k, v in opts.items() if k not in ("favor_recall", "favor_precision")}
    yield {**base, "favor_precision": True}
    yield base


def fetch_article_content(url, feed_config):
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        html = r.content.decode(r.encoding or "utf-8", errors="replace")
    except Exception as e:
        log.warning(f"Could not fetch content for {url}: {e}")
        return ""

    opts = feed_config.get("extract_opts") or {}
    filters = feed_config.get("content_filters")
    best = ""
    for attempt in extraction_attempts(opts):
        try:
            text = clean_content(trafilatura.extract(html, **attempt), filters)
        except Exception:
            continue
        if len(text.split()) > len(best.split()):
            best = text
        if len(best.split()) >= MIN_CONTENT_WORDS:
            break
    return best


def insert_article(conn, feed_config, entry):
    url = entry.get("link", "")
    title = entry.get("title", "")
    log.info(f"Processing: {title[:60]}")
    content = fetch_article_content(url, feed_config)
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
                feed_config["name"],
                title,
                url,
                content,
                word_count,
                parse_published(entry),
            ),
        )
    return word_count


def fetch_and_store():
    log.info("Starting fetch_and_store")
    conn = get_connection()
    total = 0
    try:
        for feed_config in FEEDS:
            log.info(f"Fetching feed: {feed_config['name']}")
            excluded = {c.casefold() for c in feed_config.get("exclude_categories", set())}
            try:
                feed = feedparser.parse(feed_config["url"])
                log.info(f"Found {len(feed.entries)} entries in {feed_config['name']}")
                stored = skipped = thin = failed = 0
                for entry in feed.entries:
                    if entry_categories(entry) & excluded:
                        skipped += 1
                        continue
                    try:
                        with savepoint(conn):
                            word_count = insert_article(conn, feed_config, entry)
                        stored += 1
                        total += 1
                        if word_count < MIN_CONTENT_WORDS:
                            thin += 1
                            # Stored, but below the digest threshold — it will not
                            # reach the summariser unless a later run extracts it
                            # properly and the ON CONFLICT update replaces it.
                            log.warning(
                                f"Extraction returned {word_count}w, below digest "
                                f"threshold: {entry.get('link', '')}"
                            )
                    except Exception as e:
                        failed += 1
                        log.error(f"Skipping article {entry.get('link', '')}: {e}")
                    sleep(0.5)
                conn.commit()
                log.info(
                    f"Committed {stored} articles from {feed_config['name']}"
                    f" (excluded: {skipped}, below threshold: {thin}, failed: {failed})"
                )
            except Exception as e:
                log.error(f"Failed to process feed {feed_config['name']}: {e}")
                conn.rollback()
        log.info(f"Done. Total articles processed: {total}")
    finally:
        conn.close()


if __name__ == "__main__":
    fetch_and_store()
