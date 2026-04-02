import anthropic
import os
import time
import logging

log = logging.getLogger(__name__)

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


def build_articles_text(articles):
    lines = []
    for _, title, url, content, published_local in articles:
        time_str = published_local.strftime("%H:%M") if published_local else ""
        lines.append(f"Time: {time_str}\nTitle: {title}\nURL: {url}\nContent: {content}\n")
    return "\n---\n".join(lines)


def submit_batch(articles_text, target_date, source_name, system_prompt, article_count=0):
    batch = client.messages.batches.create(
        requests=[{
            "custom_id": f"{source_name}-digest-{target_date}",
            "params": {
                "model": "claude-sonnet-4-6",
                "max_tokens": 8192,
                "temperature": 0,
                "system": system_prompt,
                "messages": [{
                    "role": "user",
                    "content": f"Here are {article_count} {source_name} articles from {target_date}:\n\n{articles_text}"
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
