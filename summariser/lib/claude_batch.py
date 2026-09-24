import anthropic
import os
import time
import logging

log = logging.getLogger(__name__)

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# Kept per-source so each digest can be tuned on its own. Both run Sonnet 5,
# which rejects temperature/top_p/top_k and thinks adaptively; max_tokens has to
# cover the thinking as well as a digest the Sonnet 5 tokenizer inflates.
MODEL_PARAMS = {
    "mediapool": {
        "model": "claude-sonnet-5",
        "max_tokens": 32000,
        "thinking": {"type": "adaptive"},
        "output_config": {"effort": "medium"},
    },
    "investor": {
        "model": "claude-sonnet-5",
        "max_tokens": 32000,
        "thinking": {"type": "adaptive"},
        "output_config": {"effort": "medium"},
    },
}


def build_articles_text(articles):
    lines = []
    for _, title, url, content, published_local in articles:
        time_str = published_local.strftime("%H:%M") if published_local else ""
        lines.append(f"Time: {time_str}\nTitle: {title}\nURL: {url}\nContent: {content}\n")
    return "\n---\n".join(lines)


def submit_batch(articles_text, target_date, source_name, system_prompt, article_count=0):
    if source_name not in MODEL_PARAMS:
        raise KeyError(f"No model config for source '{source_name}' - add one to MODEL_PARAMS")
    model_params = MODEL_PARAMS[source_name]

    log.info(f"Submitting {source_name} digest to {model_params['model']}")
    batch = client.messages.batches.create(
        requests=[{
            "custom_id": f"{source_name}-digest-{target_date}",
            "params": {
                **model_params,
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
        if result.result.type != "succeeded":
            log.error(f"Batch request {result.custom_id} {result.result.type}: {getattr(result.result, 'error', None)}")
            continue

        message = result.result.message
        usage = message.usage
        log.info(f"Tokens: input={usage.input_tokens} output={usage.output_tokens}, stop_reason={message.stop_reason}")

        if message.stop_reason == "max_tokens":
            log.error("Digest hit max_tokens and is truncated - discarding.")
            return None

        # Adaptive thinking puts a thinking block first, so pick the text block
        # by type rather than indexing into content.
        text = next((b.text for b in message.content if b.type == "text"), None)
        if not text:
            log.error("No text block in the response content.")
            return None
        return text

    return None
