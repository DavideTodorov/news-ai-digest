import os
import logging
from datetime import timedelta, datetime
from zoneinfo import ZoneInfo
from dotenv import load_dotenv

from lib.db import get_connection, fetch_articles, mark_summarised, save_digest
from lib.claude_batch import build_labelled_articles_text, check_context, submit_batch, poll_batch
from lib.discord import send_to_discord
from lib.prompts import COMBINED_PROMPT_WEEKDAY, COMBINED_PROMPT_WEEKEND

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

SOFIA_TZ = ZoneInfo("Europe/Sofia")

# feed_source in the articles table -> the name the model sees on each article.
SOURCES = [
    ("Mediapool", "Mediapool"),
    ("Investor", "Investor.bg"),
]


def run():
    yesterday = (datetime.now(SOFIA_TZ) - timedelta(days=1)).date()
    is_weekday = yesterday.weekday() < 5
    log.info(f"Running combined summariser for {yesterday} (weekday={is_weekday})")

    conn = get_connection()
    try:
        labelled = []
        for feed_source, label in SOURCES:
            articles = fetch_articles(conn, feed_source, yesterday)
            log.info(f"Found {len(articles)} {label} articles")
            labelled.extend((label, a) for a in articles)

        if not labelled:
            log.info("No articles found for yesterday.")
            return

        # One timeline, newest first, so neither source reads as the lead.
        labelled.sort(key=lambda la: la[1][4] or datetime.min, reverse=True)
        article_ids = [a[0] for _, a in labelled]
        log.info(f"Summarising {len(labelled)} articles in total")

        prompt = COMBINED_PROMPT_WEEKDAY if is_weekday else COMBINED_PROMPT_WEEKEND
        articles_text = build_labelled_articles_text(labelled)

        try:
            check_context(articles_text, yesterday, "combined", prompt, len(labelled))
        except Exception as e:
            log.warning(f"Could not count input tokens before submitting: {e}")

        batch_id = submit_batch(articles_text, yesterday, "combined", prompt, len(labelled))
        log.info(f"Batch submitted: {batch_id}")

        digest = poll_batch(batch_id)
        if not digest:
            log.error("Batch failed or returned no results.")
            return

        save_digest(conn, yesterday, "combined", digest, batch_id)
        mark_summarised(conn, article_ids)
        conn.commit()

        discord_enabled = os.getenv("ENABLE_DISCORD", "true").lower() == "true"
        if not discord_enabled:
            log.info("Discord notifications disabled via ENABLE_DISCORD flag")
            return

        webhook_url = os.getenv("DISCORD_WEBHOOK_COMBINED")
        if not webhook_url:
            log.warning("DISCORD_WEBHOOK_COMBINED not set, skipping Discord notification")
            return

        try:
            send_to_discord(digest, yesterday, webhook_url, "🗞️ Общ (Mediapool и Investor.bg)", 15105570)
            log.info("Discord notification sent")
        except Exception as e:
            log.error(f"Discord notification failed: {e}")

    finally:
        conn.close()


if __name__ == "__main__":
    run()
