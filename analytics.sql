-- Analyse AVG word count per article for a day
SELECT SUM(word_count)/COUNT(*) AS avg_words FROM articles
WHERE feed_source='Investor' AND published_at::DATE=CURRENT_DATE


-- Daily Article Volume by Source: To see which feeds are the most active "today,"
-- this query groups the incoming articles and ranks the sources by volume.
SELECT
    feed_source,
    COUNT(*) AS articles_published_today
FROM articles
WHERE published_at >= CURRENT_DATE
  AND published_at < CURRENT_DATE + INTERVAL '1 day'
GROUP BY feed_source
ORDER BY articles_published_today DESC;


-- Content Length Distribution: If you want to understand the typical article size across different feeds
-- (useful for estimating LLM token usage or processing time),
-- this gives you the minimum, maximum, and average word counts.
SELECT
    feed_source,
    MIN(word_count) AS shortest_article,
    ROUND(AVG(word_count)) AS avg_length,
    MAX(word_count) AS longest_article
FROM articles
WHERE word_count IS NOT NULL
GROUP BY feed_source
ORDER BY avg_length DESC;