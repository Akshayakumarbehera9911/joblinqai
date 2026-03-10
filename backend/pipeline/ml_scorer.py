"""
ml_scorer.py — ML-based hiring verdict for JobPortal
Sits alongside scorer.py in backend/pipeline/
Does NOT replace scorer.py — adds a separate market verdict.

Usage in runner.py:
    from backend.pipeline.ml_scorer import get_ml_verdict
    verdict = get_ml_verdict(
        experience_years=profile.experience,
        education_level=profile.education_level,
        skills_match_percent=skill_score,
        num_projects=len(projects),
        num_certifications=len(certs),
        role_type=role_info['role_type']
    )
    # verdict is None if profile incomplete, else a dict
"""

import os
import pickle
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# ── Paths ────────────────────────────────────────────────────────────────────
_BASE = Path(__file__).resolve().parent.parent / "ml"
_MODEL_PATH   = _BASE / "readiness_model.pkl"
_ENCODER_PATH = _BASE / "label_encoders.pkl"

# ── Lazy-load model once at startup ─────────────────────────────────────────
_model_bundle   = None
_encoder_bundle = None

def _load():
    global _model_bundle, _encoder_bundle
    if _model_bundle is None:
        if not _MODEL_PATH.exists():
            raise FileNotFoundError(f"Model file not found: {_MODEL_PATH}")
        if not _ENCODER_PATH.exists():
            raise FileNotFoundError(f"Encoder file not found: {_ENCODER_PATH}")
        with open(_MODEL_PATH, "rb") as f:
            _model_bundle = pickle.load(f)
        with open(_ENCODER_PATH, "rb") as f:
            _encoder_bundle = pickle.load(f)
        logger.info("ML scorer loaded: %s | Accuracy: %.2f | AUC: %.3f",
                    _model_bundle.get("model_name", "unknown"),
                    _model_bundle.get("test_accuracy", 0),
                    float(_model_bundle.get("test_auc", 0)))


# ── Education & role encoding maps (match training exactly) ─────────────────
_EDU_MAP = {
    "class10": 0, "class12": 1, "iti": 2, "diploma": 3,
    "graduate": 4, "postgraduate": 5, "phd": 6
}
_ROLE_MAP = {
    "blue_collar": 0, "non_technical": 1, "technical": 2
}

# ── Verdict labels ───────────────────────────────────────────────────────────
def _verdict_label(prob: float) -> dict:
    if prob >= 0.75:
        return {"label": "Strong candidate", "emoji": "✅", "color": "green"}
    elif prob >= 0.55:
        return {"label": "Competitive", "emoji": "🟡", "color": "yellow"}
    elif prob >= 0.40:
        return {"label": "Borderline", "emoji": "⚠️",  "color": "orange"}
    else:
        return {"label": "Not yet competitive", "emoji": "❌", "color": "red"}


# ── Feature builder (identical to training) ──────────────────────────────────
def _build_features(
    experience_years: int,
    education_level: str,
    skills_match_percent: int,
    num_projects: int,
    num_certifications: int,
    role_type: str
) -> list:

    edu_encoded  = _EDU_MAP.get(education_level.lower(), 4)   # default graduate
    role_encoded = _ROLE_MAP.get(role_type.lower(), 1)        # default non_technical

    # Engineered features — must match training exactly
    skills_bucket = (
        0 if skills_match_percent < 35 else
        1 if skills_match_percent < 60 else
        2
    )
    exp_bucket = (
        0 if experience_years == 0 else
        1 if experience_years <= 3 else
        2 if experience_years <= 7 else
        3
    )
    profile_strength = (
        (skills_match_percent * 0.5) +
        (num_projects * 8) +
        (num_certifications * 5)
    )
    is_technical  = 1 if role_type.lower() == "technical" else 0
    exp_x_skills  = experience_years * skills_match_percent

    return [
        experience_years,
        edu_encoded,
        skills_match_percent,
        num_projects,
        num_certifications,
        role_encoded,
        skills_bucket,
        exp_bucket,
        profile_strength,
        is_technical,
        exp_x_skills,
    ]


# ── Public function ──────────────────────────────────────────────────────────
def get_ml_verdict(
    experience_years,
    education_level,
    skills_match_percent,
    num_projects,
    num_certifications,
    role_type
) -> dict | None:
    """
    Returns a verdict dict or None if profile is too incomplete to predict.

    Return shape:
    {
        "probability":  0.72,
        "prediction":   "HIRED",
        "label":        "Competitive",
        "emoji":        "🟡",
        "color":        "yellow",
        "note":         None   # or a warning string if defaults were used
    }
    """

    # ── Hard block — cannot predict without these ────────────────────────────
    if experience_years is None or education_level is None or role_type is None:
        logger.debug("ML verdict skipped — critical fields missing")
        return None

    # ── Soft defaults — run with 0 for missing counts ────────────────────────
    note = None
    if skills_match_percent is None:
        skills_match_percent = 0
        note = "Complete your profile for a more accurate verdict"
    if num_projects is None:
        num_projects = 0
        note = "Complete your profile for a more accurate verdict"
    if num_certifications is None:
        num_certifications = 0

    # ── Clamp values to safe ranges ──────────────────────────────────────────
    if isinstance(experience_years, str):
        import re as _re
        nums = _re.findall(r"\d+", experience_years)
        experience_years = int(nums[0]) if nums else 0
    experience_years     = max(0, min(15, int(experience_years)))
    skills_match_percent = max(0, min(100, int(skills_match_percent)))
    num_projects         = max(0, min(6, int(num_projects)))
    num_certifications   = max(0, min(5, int(num_certifications)))

    try:
        _load()
        model  = _model_bundle["model"]
        scaler = _model_bundle["scaler"]

        features = _build_features(
            experience_years,
            education_level,
            skills_match_percent,
            num_projects,
            num_certifications,
            role_type
        )

        features_scaled = scaler.transform([features])
        prob = float(model.predict_proba(features_scaled)[0][1])
        prediction = "HIRED" if prob >= 0.5 else "NOT HIRED"

        result = {
            "probability": round(prob, 4),
            "prediction":  prediction,
            "note":        note,
        }
        result.update(_verdict_label(prob))
        return result

    except Exception as e:
        logger.error("ML verdict failed: %s", str(e))
        print(f"ML VERDICT ERROR: {e}") 
        return None  # fail silently — never break the main pipeline