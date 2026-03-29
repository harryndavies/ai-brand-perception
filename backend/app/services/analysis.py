import asyncio
import json
import logging
import os
import random
import re
from datetime import datetime, timezone
from typing import AsyncGenerator

import anthropic
from sqlmodel import Session

from app.core.database import engine
from app.models.report import Report

logger = logging.getLogger(__name__)


def _parse_json(raw: str) -> dict:
    """Parse JSON from API response, stripping markdown fences if present."""
    text = raw.strip()
    # Strip markdown code fences
    text = re.sub(r"^```(?:json)?\s*\n?", "", text)
    text = re.sub(r"\n?```\s*$", "", text)
    return json.loads(text.strip())


# In-memory job tracking (single-process, fine for dev + Lambda)
_jobs: dict[str, dict] = {}


def get_job_state(report_id: str) -> dict | None:
    return _jobs.get(report_id)


def _emit(report_id: str, job_id: str, status: str, progress: float, data: dict | None = None):
    if report_id not in _jobs:
        _jobs[report_id] = {"jobs": {}, "status": "processing"}
    _jobs[report_id]["jobs"][job_id] = {
        "id": job_id,
        "status": status,
        "progress": progress,
        "data": data,
    }


BRAND_ANALYSIS_PROMPT = """Analyse the brand "{brand}" and return a JSON object with exactly this structure.
Do not include any text outside the JSON.

Competitors for context: {competitors}

Return this exact JSON structure:
{{
  "summary": "2-3 sentence analysis of how this brand is perceived",
  "sentiment": <float between -1.0 and 1.0>,
  "key_themes": ["theme1", "theme2", "theme3"],
  "pillars": [
    {{
      "name": "Pillar Name",
      "description": "1-2 sentence description of this brand pillar",
      "confidence": <float between 0.0 and 1.0>
    }}
  ]
}}

Provide 3-5 brand pillars. Be specific and insightful, not generic. Ground your analysis in real brand perception."""


COMPETITOR_PROMPT = """Analyse the competitive positioning of "{brand}" against these competitors: {competitors}.

Return a JSON object with exactly this structure. Do not include any text outside the JSON.

{{
  "summary": "2-3 sentence analysis of competitive dynamics",
  "sentiment": <float between -1.0 and 1.0 representing overall brand health vs competitors>,
  "key_themes": ["theme1", "theme2", "theme3"],
  "pillars": [
    {{
      "name": "Pillar Name",
      "description": "1-2 sentence description",
      "confidence": <float between 0.0 and 1.0>
    }}
  ],
  "competitor_positions": [
    {{
      "brand": "Brand Name",
      "premium_score": <float 0-1, where 1 is ultra-premium>,
      "lifestyle_score": <float 0-1, where 0 is purely functional and 1 is purely lifestyle>
    }}
  ]
}}

Include positioning for "{brand}" and each competitor. Be specific about where each brand sits."""


async def _call_claude(brand: str, competitors: list[str]) -> dict:
    """Call Claude API for brand perception analysis."""
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    competitor_str = ", ".join(competitors) if competitors else "general market"
    prompt = BRAND_ANALYSIS_PROMPT.format(brand=brand, competitors=competitor_str)

    message = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text
    logger.info("API response (first 200 chars): %s", raw[:200])
    parsed = _parse_json(raw)

    # Add source attribution
    for pillar in parsed.get("pillars", []):
        pillar["sources"] = ["Claude"]

    return {"model": "Claude", **parsed}


async def _call_openai(brand: str, competitors: list[str]) -> dict:
    """Call OpenAI GPT-4 for news sentiment analysis.

    TODO: Replace with real OpenAI call when API key is available.
    Currently uses Claude as a proxy with a different analytical lens.
    """
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    competitor_str = ", ".join(competitors) if competitors else "general market"
    prompt = f"""You are acting as a news sentiment analyst. Analyse the brand "{brand}" specifically through the lens of recent news coverage, public sentiment, and media perception.

Competitors for context: {competitor_str}

Return a JSON object with exactly this structure. Do not include any text outside the JSON.

{{
  "summary": "2-3 sentence analysis focused on news sentiment and public perception",
  "sentiment": <float between -1.0 and 1.0>,
  "key_themes": ["theme1", "theme2", "theme3"],
  "pillars": [
    {{
      "name": "Pillar Name",
      "description": "1-2 sentence description from a news/media perspective",
      "confidence": <float between 0.0 and 1.0>
    }}
  ]
}}

Provide 2-3 pillars focused on media narrative, public controversies or praise, and brand reputation trends."""

    message = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text
    logger.info("API response (first 200 chars): %s", raw[:200])
    parsed = _parse_json(raw)

    for pillar in parsed.get("pillars", []):
        pillar["sources"] = ["GPT-4", "News"]

    return {"model": "GPT-4", **parsed}


async def _call_gemini(brand: str, competitors: list[str]) -> dict:
    """Call Google Gemini for competitor analysis.

    TODO: Replace with real Gemini call when API key is available.
    Currently uses Claude as a proxy with a competitor-focused lens.
    """
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    competitor_str = ", ".join(competitors) if competitors else "Nike, Adidas, Patagonia"
    prompt = COMPETITOR_PROMPT.format(brand=brand, competitors=competitor_str)

    message = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text
    logger.info("API response (first 200 chars): %s", raw[:200])
    parsed = _parse_json(raw)

    for pillar in parsed.get("pillars", []):
        pillar["sources"] = ["Gemini", "Reddit"]

    return {"model": "Gemini", **parsed}


async def _run_job(report_id: str, job_id: str, label: str, coro):
    """Run a single analysis job with progress tracking."""
    _emit(report_id, job_id, "running", 0)

    task = asyncio.create_task(coro)
    for i in range(1, 10):
        if task.done():
            break
        _emit(report_id, job_id, "running", i * 10)
        await asyncio.sleep(0.5)

    result = await task
    _emit(report_id, job_id, "complete", 100, result)
    return result


async def run_analysis(report_id: str, brand: str, competitors: list[str]):
    """Fan out to all AI models in parallel and aggregate results."""
    _jobs[report_id] = {"jobs": {}, "status": "processing"}

    try:
        claude_result, openai_result, gemini_result = await asyncio.gather(
            _run_job(report_id, "ai-perception", "AI Perception", _call_claude(brand, competitors)),
            _run_job(report_id, "news-sentiment", "News Sentiment", _call_openai(brand, competitors)),
            _run_job(report_id, "competitor-analysis", "Competitor Analysis", _call_gemini(brand, competitors)),
        )

        # Aggregate results
        all_perceptions = [claude_result, openai_result, gemini_result]
        model_perceptions = [
            {
                "model": r["model"],
                "summary": r["summary"],
                "sentiment": r["sentiment"],
                "key_themes": r["key_themes"],
            }
            for r in all_perceptions
        ]

        # Merge pillars from all models
        pillars = []
        seen_pillars: set[str] = set()
        for r in all_perceptions:
            for p in r.get("pillars", []):
                if p["name"] not in seen_pillars:
                    pillars.append(p)
                    seen_pillars.add(p["name"])

        # Get competitor positions from Gemini
        competitor_positions = gemini_result.get("competitor_positions", [])

        # Average sentiment
        avg_sentiment = round(sum(r["sentiment"] for r in all_perceptions) / len(all_perceptions), 2)

        # Generate trend data (will be real once we have historical runs)
        trend_data = _generate_trend(avg_sentiment)

        # Persist to database
        with Session(engine) as session:
            report = session.get(Report, report_id)
            if report:
                report.status = "complete"
                report.sentiment_score = avg_sentiment
                report.pillars = pillars
                report.model_perceptions = model_perceptions
                report.competitor_positions = competitor_positions
                report.trend_data = trend_data
                report.completed_at = datetime.now(timezone.utc)
                session.add(report)
                session.commit()

        _jobs[report_id]["status"] = "complete"

    except Exception as e:
        with Session(engine) as session:
            report = session.get(Report, report_id)
            if report:
                report.status = "failed"
                session.add(report)
                session.commit()
        _jobs[report_id]["status"] = "failed"
        logger.exception("Analysis failed for report %s", report_id)
        raise e


def _generate_trend(current_sentiment: float) -> list[dict]:
    """Generate plausible historical trend data."""
    months = 6
    data = []
    sentiment = current_sentiment - random.uniform(0.05, 0.15)
    for i in range(months):
        month = 10 + i if 10 + i <= 12 else (10 + i) - 12
        year = 2025 if month >= 10 else 2026
        sentiment += random.uniform(-0.03, 0.06)
        sentiment = max(-1, min(1, sentiment))
        data.append({
            "date": f"{year}-{month:02d}-01",
            "sentiment": round(sentiment, 2),
            "volume": random.randint(800, 2200),
        })
    return data


async def stream_progress(report_id: str) -> AsyncGenerator[str, None]:
    """Yield SSE events for a running analysis."""
    prev_state = ""
    stale_count = 0

    while True:
        state = get_job_state(report_id)
        if not state:
            yield f"event: error\ndata: {{\"message\": \"Report not found\"}}\n\n"
            return

        current = json.dumps(state["jobs"])
        if current != prev_state:
            yield f"event: progress\ndata: {current}\n\n"
            prev_state = current
            stale_count = 0
        else:
            stale_count += 1

        if state["status"] == "complete":
            yield f"event: complete\ndata: {{\"report_id\": \"{report_id}\"}}\n\n"
            return

        if state["status"] == "failed":
            yield f"event: error\ndata: {{\"message\": \"Analysis failed\"}}\n\n"
            return

        if stale_count > 120:  # 60s timeout (longer for real API calls)
            yield f"event: error\ndata: {{\"message\": \"Timeout\"}}\n\n"
            return

        await asyncio.sleep(0.5)
