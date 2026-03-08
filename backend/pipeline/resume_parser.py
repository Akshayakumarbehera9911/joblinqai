# ── Resume Parser ─────────────────────────────────────────────────────────
# Step 0 (optional enrichment): Scrubs PII from resume text, then uses
# Groq to extract skills not already in candidate profile.
# Called by runner.py before gap identification.

import re
import json
from groq import Groq
from backend.config import GROQ_API_KEY

client = Groq(api_key=GROQ_API_KEY)


def scrub_pii(text: str) -> str:
    """Remove emails, phone numbers, pincodes, and address hints."""
    # Emails
    text = re.sub(r'\b[\w.+-]+@[\w-]+\.\w+\b', '', text)
    # Indian phone numbers
    text = re.sub(r'\b(\+91[\s-]?)?[6-9]\d{9}\b', '', text)
    # 6-digit pincodes
    text = re.sub(r'\b\d{6}\b', '', text)
    # Common address keywords and the rest of that line
    text = re.sub(
        r'(address|flat no|house no|door no|near|opposite|opp\.|landmark|locality|street|nagar|colony|road|lane|plot).*',
        '', text, flags=re.IGNORECASE
    )
    # Aadhaar / PAN patterns
    text = re.sub(r'\b\d{4}\s\d{4}\s\d{4}\b', '', text)        # Aadhaar
    text = re.sub(r'\b[A-Z]{5}[0-9]{4}[A-Z]\b', '', text)      # PAN
    # Collapse extra blank lines
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def _strip_think_tags(text: str) -> str:
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()


def extract_skills_from_resume(resume_text: str, existing_skills: list) -> list:
    """
    Use Groq to extract skills from resume text that are NOT already
    in the candidate's profile. Returns list of skill name strings.
    """
    if not resume_text or not resume_text.strip():
        return []

    clean_text = scrub_pii(resume_text)

    # Truncate to avoid token limits (keep first 3000 chars)
    if len(clean_text) > 3000:
        clean_text = clean_text[:3000] + "\n...[truncated]"

    prompt = f"""You are extracting technical and professional skills from a resume.

Resume text:
{clean_text}

Skills already known from the candidate's profile (do NOT repeat these):
{json.dumps(existing_skills)}

Extract ONLY skills that are:
1. Clearly mentioned in the resume text
2. NOT already in the known skills list above
3. Technical skills, tools, frameworks, languages, methodologies, or domain expertise

Return ONLY a JSON array of skill name strings. No explanation, no markdown.
Example: ["Docker", "Kubernetes", "Agile", "REST APIs"]

If no new skills found, return: []"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=400,
            temperature=0.1
        )
        raw = _strip_think_tags(response.choices[0].message.content)
        raw = raw.replace("```json", "").replace("```", "").strip()
        skills = json.loads(raw)
        if not isinstance(skills, list):
            return []
        # Return only strings, max 20 new skills
        return [s for s in skills if isinstance(s, str)][:20]
    except Exception:
        return []