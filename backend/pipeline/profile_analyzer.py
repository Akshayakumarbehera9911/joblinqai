# ── Step 3: Profile Analyzer ──────────────────────────────────────────────
# Structures candidate data into clean format for scoring
# Uses AI to extract additional skills from resume text if available

import json
from groq import Groq
from backend.config import GROQ_API_KEY

client = Groq(api_key=GROQ_API_KEY)


def _strip_think_tags(text: str) -> str:
    """Remove <think>...</think> blocks from reasoning models."""
    import re
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()


def extract_skills_from_resume(resume_text: str) -> list:
    """Use AI to extract skills from resume text."""
    if not resume_text or len(resume_text.strip()) < 50:
        return []

    prompt = f"""Extract all technical and professional skills from this resume text.
Return ONLY a JSON array of skill names. No explanation, no markdown, no extra text.
Example: ["Python", "SQL", "Communication", "Project Management"]

Resume:
{resume_text[:3000]}"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500,
            temperature=0.1
        )
        raw = _strip_think_tags(response.choices[0].message.content)
        # Clean up any markdown
        raw = raw.replace("```json", "").replace("```", "").strip()
        skills = json.loads(raw)
        return skills if isinstance(skills, list) else []
    except Exception:
        return []


def analyze_profile(profile, skills_list, certs_list, projects_list) -> dict:
    """Structure all candidate data into clean format."""

    # Combine form skills with resume-extracted skills
    form_skills = [s.skill_name for s in skills_list]
    resume_skills = []

    if profile.resume_text:
        resume_skills = extract_skills_from_resume(profile.resume_text)

    # Merge and deduplicate (case-insensitive)
    all_skills_lower = set(s.lower() for s in form_skills)
    for rs in resume_skills:
        if rs.lower() not in all_skills_lower:
            form_skills.append(rs)
            all_skills_lower.add(rs.lower())

    return {
        "skills":       form_skills,
        "certifications": [c.cert_name for c in certs_list],
        "projects":     [{"title": p.title, "tech_stack": p.tech_stack} for p in projects_list],
        "experience":   profile.experience or "0",
        "education":    profile.education_level or "",
        "target_role":  profile.target_role or "",
        "industry":     profile.industry or "",
        "location":     f"{profile.city}, {profile.state}" if profile.city else "",
    }