import os
import logging
from datetime import timedelta, datetime
from zoneinfo import ZoneInfo
from dotenv import load_dotenv

from lib.db import get_connection, fetch_articles, mark_summarised, save_digest
from lib.claude_batch import build_articles_text, submit_batch, poll_batch
from lib.discord import send_to_discord
from lib.prompts import BGONAIR_PROMPT

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

SOFIA_TZ = ZoneInfo("Europe/Sofia")


def run():
    yesterday = (datetime.now(SOFIA_TZ) - timedelta(days=1)).date()
    log.info(f"Running BGonAir summariser for {yesterday}")

    conn = get_connection()
    try:
        articles = fetch_articles(conn, "BGonAir", yesterday)
        if not articles:
            log.info("No articles found for yesterday.")
            return

        log.info(f"Found {len(articles)} articles to summarise")
        article_ids = [a[0] for a in articles]

        batch_id = submit_batch(build_articles_text(articles), yesterday, "bgonair", BGONAIR_PROMPT, len(articles))
        log.info(f"Batch submitted: {batch_id}")

        digest = poll_batch(batch_id)
        if not digest:
            log.error("Batch failed or returned no results.")
            return

        save_digest(conn, yesterday, "bgonair", digest, batch_id)
        mark_summarised(conn, article_ids)
        conn.commit()

        webhook_url = os.getenv("DISCORD_WEBHOOK_BGONAIR")
        if not webhook_url:
            log.warning("DISCORD_WEBHOOK_BGONAIR not set, skipping Discord notification")
            return

        try:
            send_to_discord(digest, yesterday, webhook_url, "📰 BGonAir", 3066993)
            log.info("Discord notification sent")
        except Exception as e:
            log.error(f"Discord notification failed: {e}")

    finally:
        conn.close()


if __name__ == "__main__":
    run()
