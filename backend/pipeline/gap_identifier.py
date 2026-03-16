# ── Step 4: Gap Identifier ────────────────────────────────────────────────
# Compares candidate skills against market demand
# Classifies each missing skill and generates Udemy links

import json
import re
from groq import Groq
from backend.config import GROQ_API_KEY
from urllib.parse import quote

client = Groq(api_key=GROQ_API_KEY)


def _strip_think_tags(text: str) -> str:
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()


def make_udemy_link(skill: str) -> str:
    return f"https://www.udemy.com/courses/search/?q={quote(skill)}"


# ── Skill implication map: if candidate has KEY, they also have VALUE ─────
# Only for genuinely implied knowledge — e.g. knowing PostgreSQL implies SQL
SKILL_IMPLICATIONS = {
    "postgresql": ["sql"],
    "mysql":      ["sql"],
    "sqlite":     ["sql"],
    "mssql":      ["sql"],
    "oracle":     ["sql"],
    "mariadb":    ["sql"],
    "pandas":     ["python"],
    "numpy":      ["python"],
    "django":     ["python"],
    "fastapi":    ["python"],
    "flask":      ["python"],
    "react":      ["javascript"],
    "vue.js":     ["javascript"],
    "angular":    ["javascript"],
    "node.js":    ["javascript"],
}


def _expand_candidate_skills(candidate_skills: list) -> set:
    """Return canonical skill set + all implied skills."""
    expanded = set(s.lower() for s in candidate_skills)
    for skill in list(expanded):
        for implied in SKILL_IMPLICATIONS.get(skill, []):
            expanded.add(implied.lower())
    return expanded


def identify_gaps(candidate_skills: list, market_demand: list, target_role: str, db=None) -> list:
    """
    Identify skill gaps.
    If db is provided, normalizes both skill lists before comparing.
    Falls back gracefully if normalizer unavailable.
    Returns list of {skill_name, gap_level, udemy_link}
    """
    if not market_demand:
        return []

    # Normalize both lists if DB session available
    if db is not None:
        try:
            from backend.pipeline.skill_normalizer import normalize_skill
            norm_candidate = [normalize_skill(s, db) for s in candidate_skills]
            norm_market    = [normalize_skill(s, db) for s in market_demand]
        except Exception:
            norm_candidate = candidate_skills
            norm_market    = market_demand
    else:
        norm_candidate = candidate_skills
        norm_market    = market_demand

    # Filter out skills candidate already has (exact + implication)
    expanded = _expand_candidate_skills(norm_candidate)
    missing  = [s for s in norm_market if s.lower() not in expanded]

    if not missing:
        return []

    # Ask Groq to classify severity of genuinely missing skills
    prompt = f"""You are analyzing skill gaps for a {target_role} job candidate.

The candidate is CONFIRMED to be missing these skills (do not question this):
{json.dumps(missing)}

Classify each missing skill's importance for the role {target_role}:
- "critical": dealbreaker, most employers require this
- "moderate": important but not always required
- "minor": nice to have

IMPORTANT RULES:
- Treat every skill as a distinct, separate requirement
- Do NOT infer that having one skill covers another
- Return ALL skills from the list above, none can be skipped
- Be consistent — do not randomly drop skills

Return ONLY a JSON array. No explanation, no markdown, no extra text.
Format: [{{"skill_name": "Statistics", "gap_level": "critical"}}, ...]"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=800,
            temperature=0.0
        )
        raw = _strip_think_tags(response.choices[0].message.content)
        raw = raw.replace("```json", "").replace("```", "").strip()
        gaps = json.loads(raw)
        if not isinstance(gaps, list):
            raise ValueError("Not a list")

        # Safety net: ensure all missing skills appear in output
        returned_names = {g["skill_name"].lower() for g in gaps if isinstance(g, dict)}
        for skill in missing:
            if skill.lower() not in returned_names:
                gaps.append({"skill_name": skill, "gap_level": "moderate"})

    except Exception:
        gaps = [{"skill_name": s, "gap_level": "moderate"} for s in missing]

    result = []
    for gap in gaps:
        if isinstance(gap, dict) and "skill_name" in gap:
            result.append({
                "skill_name": gap["skill_name"],
                "gap_level":  gap.get("gap_level", "moderate"),
                "udemy_link": make_udemy_link(gap["skill_name"])
            })

    return result
