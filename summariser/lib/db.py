import os
import psycopg2


def get_connection():
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set")
    return psycopg2.connect(url)


def fetch_articles(conn, feed_source, target_date):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, title, url, content,
                   published_at AT TIME ZONE 'Europe/Sofia' AS published_local
            FROM articles
            WHERE feed_source = %s
              AND DATE(published_at AT TIME ZONE 'Europe/Sofia') = %s
              AND word_count >= 50
            ORDER BY published_at DESC
        """, (feed_source, target_date))
        return cur.fetchall()


def mark_summarised(conn, article_ids):
    with conn.cursor() as cur:
        cur.execute("UPDATE articles SET summarised = TRUE WHERE id = ANY(%s)", (article_ids,))


def save_digest(conn, date, source_name, content, batch_id):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO digests (date, source, content, batch_id)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (date, source) DO UPDATE
                SET content = EXCLUDED.content,
                    batch_id = EXCLUDED.batch_id
        """, (date, source_name, content, batch_id))
