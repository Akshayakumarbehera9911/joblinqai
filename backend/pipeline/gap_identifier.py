# ── Step 4: Gap Identifier ────────────────────────────────────────────────
# Compares candidate skills against market demand
# Classifies each missing skill and generates Udemy links

import json
from groq import Groq
from backend.config import GROQ_API_KEY
from urllib.parse import quote

client = Groq(api_key=GROQ_API_KEY)


def _strip_think_tags(text: str) -> str:
    import re
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()


def make_udemy_link(skill: str) -> str:
    return f"https://www.udemy.com/courses/search/?q={quote(skill)}"


def identify_gaps(candidate_skills: list, market_demand: list, target_role: str) -> list:
    """
    Use AI to identify skill gaps and classify them.
    Returns list of {skill_name, gap_level, udemy_link}
    """
    if not market_demand:
        return []

    prompt = f"""You are analyzing a job candidate's skill gaps for the role: {target_role}

Candidate's current skills:
{json.dumps(candidate_skills)}

Skills demanded by the market for this role:
{json.dumps(market_demand)}

Identify which market-demanded skills the candidate is MISSING or WEAK in.
For each gap, classify it as:
- "critical": dealbreaker, most employers require this
- "moderate": important but not always required
- "minor": nice to have

Return ONLY a JSON array. No explanation, no markdown, no extra text.
Format: [{{"skill_name": "Python", "gap_level": "critical"}}, ...]

If the candidate already has all skills, return an empty array: []"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=800,
            temperature=0.1
        )
        raw = _strip_think_tags(response.choices[0].message.content)
        raw = raw.replace("```json", "").replace("```", "").strip()
        gaps = json.loads(raw)
        if not isinstance(gaps, list):
            return []
    except Exception:
        # Fallback: simple string matching
        candidate_lower = set(s.lower() for s in candidate_skills)
        gaps = []
        for skill in market_demand[:10]:
            if skill.lower() not in candidate_lower:
                gaps.append({"skill_name": skill, "gap_level": "moderate"})

    # Add Udemy links
    result = []
    for gap in gaps:
        if isinstance(gap, dict) and "skill_name" in gap:
            result.append({
                "skill_name": gap["skill_name"],
                "gap_level":  gap.get("gap_level", "moderate"),
                "udemy_link": make_udemy_link(gap["skill_name"])
            })

    return result