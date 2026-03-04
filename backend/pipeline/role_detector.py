# ── Step 1: Role Type Detector ─────────────────────────────────────────────
# Classifies target role into technical / non-technical / blue-collar
# Returns role_type and scoring weights

TECHNICAL_KEYWORDS = [
    "developer", "engineer", "programmer", "software", "data", "devops",
    "backend", "frontend", "fullstack", "full stack", "cloud", "architect",
    "analyst", "scientist", "machine learning", "ai ", "artificial", "cyber",
    "security", "network", "database", "dba", "sre", "qa", "tester",
    "mobile", "android", "ios", "react", "python", "java", "dotnet", ".net",
    "embedded", "firmware", "it support", "system admin", "sysadmin"
]

BLUE_COLLAR_KEYWORDS = [
    "driver", "delivery", "electrician", "plumber", "carpenter", "mason",
    "welder", "mechanic", "technician", "helper", "labour", "labor",
    "peon", "security guard", "guard", "watchman", "cleaner", "housekeeping",
    "cook", "chef", "waiter", "sweeper", "loader", "unloader", "operator",
    "factory", "production", "assembly", "packaging", "warehouse",
    "field work", "fieldwork", "construction", "fabrication", "fitter"
]

WEIGHTS = {
    "technical":     {"experience": 35, "projects": 25, "skills": 25, "education": 15},
    "non-technical": {"experience": 30, "projects": 10, "skills": 25, "education": 35},
    "blue-collar":   {"experience": 20, "projects":  0, "skills": 15, "education": 65},
}


def detect_role_type(target_role: str) -> dict:
    role_lower = target_role.lower()

    for kw in TECHNICAL_KEYWORDS:
        if kw in role_lower:
            return {"role_type": "technical", "weights": WEIGHTS["technical"]}

    for kw in BLUE_COLLAR_KEYWORDS:
        if kw in role_lower:
            return {"role_type": "blue-collar", "weights": WEIGHTS["blue-collar"]}

    return {"role_type": "non-technical", "weights": WEIGHTS["non-technical"]}