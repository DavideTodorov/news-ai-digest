import re
import requests
import logging
from datetime import datetime
from zoneinfo import ZoneInfo

log = logging.getLogger(__name__)

SOFIA_TZ = ZoneInfo("Europe/Sofia")


def send_to_discord(text, target_date, webhook_url, label, color, include_time=False):
    date_label = target_date.strftime("%d.%m.%Y")
    if include_time:
        time_label = datetime.now(SOFIA_TZ).strftime("%H:%M")
        header_title = f"{label} — Какво се случи на {date_label} ({time_label})"
    else:
        header_title = f"{label} — Какво се случи на {date_label}"

    sections = re.split(r'\n(?=# [^#])', text.strip())
    first = True

    for section in sections:
        lines = section.strip().split('\n', 1)
        if lines[0].startswith('# '):
            title = lines[0].lstrip('#').strip()
            body = lines[1].strip() if len(lines) > 1 else ''
        else:
            title = header_title
            body = lines[0].strip()

        if first:
            title = header_title
            first = False

        while body:
            chunk, body = body[:4096], body[4096:]
            requests.post(webhook_url, json={
                "embeds": [{"title": title, "description": chunk, "color": color}]
            }, timeout=10)
            title = f"{title} (продължение)"
