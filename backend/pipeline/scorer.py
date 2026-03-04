# ── Step 5: Scorer ────────────────────────────────────────────────────────
# Calculates weighted readiness score /100
# Uses role-specific weights from Step 1

import json
from groq import Groq
from backend.config import GROQ_API_KEY

client = Groq(api_key=GROQ_API_KEY)


def _strip_think_tags(text: str) -> str:
    import re
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()


EDUCATION_LEVELS = {
    "phd": 100, "postgraduate": 90, "graduate": 80, "diploma": 65,
    "iti": 60, "class12": 45, "class10": 30, "other": 50
}

EXPERIENCE_SCORES = {
    "10+": 100, "10": 100, "9": 95, "8": 90, "7": 85,
    "6": 80, "5": 75, "4": 70, "3": 65, "2": 58,
    "1": 48, "<1": 30, "0": 10
}


def score_education(education_level: str) -> int:
    if not education_level:
        return 30
    key = education_level.lower().replace(" ", "").replace("-", "")
    for k, v in EDUCATION_LEVELS.items():
        if k in key:
            return v
    return 50


def score_experience(experience: str) -> int:
    if not experience:
        return 10
    return EXPERIENCE_SCORES.get(experience.strip(), 30)


def score_projects(projects: list, role_type: str) -> int:
    if role_type != "technical":
        return 0
    count = len(projects)
    if count == 0: return 0
    if count == 1: return 40
    if count == 2: return 60
    if count == 3: return 75
    return min(90, 75 + (count - 3) * 5)


def score_skills(candidate_skills: list, market_demand: list, certs: list) -> int:
    if not market_demand:
        return 50
    candidate_lower = set(s.lower() for s in candidate_skills)
    matched = sum(1 for s in market_demand if s.lower() in candidate_lower)
    skill_score = min(100, int((matched / len(market_demand)) * 100))

    # Bonus for certifications
    cert_bonus = min(15, len(certs) * 5)
    return min(100, skill_score + cert_bonus)


def calculate_score(structured_profile: dict, market_demand: list, weights: dict) -> dict:
    """Calculate weighted readiness score and return full breakdown."""

    exp_score  = score_experience(structured_profile["experience"])
    proj_score = score_projects(structured_profile["projects"], structured_profile.get("role_type", "technical"))
    skill_score = score_skills(structured_profile["skills"], market_demand, structured_profile["certifications"])
    edu_score  = score_education(structured_profile["education"])

    # Weighted overall score
    overall = int(
        (exp_score  * weights["experience"] / 100) +
        (proj_score * weights["projects"]   / 100) +
        (skill_score * weights["skills"]    / 100) +
        (edu_score  * weights["education"]  / 100)
    )
    overall = max(0, min(100, overall))

    return {
        "overall_score":    overall,
        "experience_score": exp_score,
        "project_score":    proj_score,
        "skills_score":     skill_score,
        "education_score":  edu_score,
        "breakdown": {
            "experience": {"score": exp_score,  "weight": weights["experience"], "contribution": int(exp_score * weights["experience"] / 100)},
            "projects":   {"score": proj_score, "weight": weights["projects"],   "contribution": int(proj_score * weights["projects"] / 100)},
            "skills":     {"score": skill_score,"weight": weights["skills"],     "contribution": int(skill_score * weights["skills"] / 100)},
            "education":  {"score": edu_score,  "weight": weights["education"],  "contribution": int(edu_score * weights["education"] / 100)},
        }
    }