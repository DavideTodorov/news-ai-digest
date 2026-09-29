import anthropic
import os
import time
import logging

log = logging.getLogger(__name__)

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# Kept per-source so each digest can be tuned on its own. Both run Opus 5.5,
# which rejects temperature/top_p/top_k and can't turn thinking off, so effort is
# the only depth control (its default is medium, hence set explicitly); max_tokens
# has to cover the thinking as well as the digest.
MODEL_PARAMS = {
    "mediapool": {
        "model": "claude-opus-5-5",
        "max_tokens": 32000,
        "thinking": {"type": "adaptive"},
        "output_config": {"effort": "low"},
    },
    "investor": {
        "model": "claude-opus-5-5",
        "max_tokens": 32000,
        "thinking": {"type": "adaptive"},
        "output_config": {"effort": "low"},
    },
    "combined": {
        "model": "claude-opus-5-5",
        "max_tokens": 32000,
        "thinking": {"type": "adaptive"},
        "output_config": {"effort": "low"},
    },
}

# Standard per-MTok rates and context window, per model. The Batch API bills
# half the standard rate; output includes the thinking tokens.
MODEL_PRICING = {
    "claude-opus-5-5": {"input": 4.00, "output": 20.00, "context_window": 1_000_000},
}
BATCH_DISCOUNT = 0.5

# Warn once the input takes this share of what the context window leaves after
# max_tokens. Nothing is ever cut to fit - the warning is the whole response.
CONTEXT_WARN_RATIO = 0.9


def _format_article(article):
    _, title, url, content, published_local = article
    time_str = published_local.strftime("%H:%M") if published_local else ""
    return f"Time: {time_str}\nTitle: {title}\nURL: {url}\nContent: {content}\n"


def build_articles_text(articles):
    return "\n---\n".join(_format_article(a) for a in articles)


def build_labelled_articles_text(labelled_articles):
    """Like build_articles_text, but each article opens with the outlet it came from."""
    return "\n---\n".join(
        f"Източник: {label}\n{_format_article(a)}" for label, a in labelled_articles
    )


def _user_content(articles_text, target_date, source_name, article_count):
    return f"Here are {article_count} {source_name} articles from {target_date}:\n\n{articles_text}"


def check_context(articles_text, target_date, source_name, system_prompt, article_count=0):
    """Count the request's input tokens and warn if it is close to the model's limit."""
    model_params = MODEL_PARAMS[source_name]
    model = model_params["model"]
    input_tokens = client.messages.count_tokens(
        model=model,
        system=system_prompt,
        messages=[{"role": "user", "content": _user_content(articles_text, target_date, source_name, article_count)}],
    ).input_tokens

    pricing = MODEL_PRICING.get(model)
    if not pricing:
        log.warning(f"No context window known for {model}; input is {input_tokens} tokens")
        return input_tokens

    budget = pricing["context_window"] - model_params["max_tokens"]
    log.info(f"Input: {input_tokens} tokens of {budget} available ({input_tokens / budget:.0%})")
    if input_tokens > budget:
        log.warning(f"Input of {input_tokens} tokens exceeds the {budget} the context window leaves "
                    f"after max_tokens - the request will likely be rejected. No articles were dropped.")
    elif input_tokens >= budget * CONTEXT_WARN_RATIO:
        log.warning(f"Input of {input_tokens} tokens is near the {budget}-token limit. No articles were dropped.")
    return input_tokens


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
                    "content": _user_content(articles_text, target_date, source_name, article_count)
                }]
            }
        }]
    )
    return batch.id


def _batch_cost(model, input_tokens, output_tokens):
    pricing = MODEL_PRICING.get(model)
    if not pricing:
        return None
    return (input_tokens * pricing["input"] + output_tokens * pricing["output"]) / 1_000_000 * BATCH_DISCOUNT


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
        cost = _batch_cost(message.model, usage.input_tokens, usage.output_tokens)
        cost_str = f"${cost:.4f}" if cost is not None else f"unknown (no pricing for {message.model})"
        log.info(f"Tokens: input={usage.input_tokens} output={usage.output_tokens}, cost={cost_str}, "
                 f"stop_reason={message.stop_reason}")

        if message.stop_reason == "max_tokens":
            log.error("Digest hit max_tokens and is truncated - discarding.")
            return None
        if message.stop_reason == "refusal":
            log.error(f"Digest was refused by safety classifiers: {getattr(message, 'stop_details', None)}")
            return None

        # Adaptive thinking puts a thinking block first, so pick the text block
        # by type rather than indexing into content.
        text = next((b.text for b in message.content if b.type == "text"), None)
        if not text:
            log.error("No text block in the response content.")
            return None
        return text

    return None
