# ── Skill Normalizer ──────────────────────────────────────────────────────────
# Converts any raw skill name to a canonical form.
# Four layers in order:
#   0. DB cache   — seen before? return instantly
#   1. Rules      — known expansions, prefixes, suffixes
#   2. RapidFuzz  — typo correction against canonical list
#   3. Groq       — only for truly unknown skills (rare after warmup)
#
# Both HR (job_skills) and Candidate (candidate_skills) pass through here.
# Result cached in skill_norm_cache table forever — Groq calls approach zero over time.

import logging
import re
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# ── Canonical skills master list ──────────────────────────────────────────────
# Covers tech, non-tech, and blue-collar for Indian job market
CANONICAL_SKILLS = [
    # Programming Languages
    "Python", "Java", "JavaScript", "TypeScript", "C", "C++", "C#", "Go",
    "Kotlin", "Swift", "Ruby", "PHP", "Rust", "Scala", "R", "MATLAB",
    "Dart", "Perl", "Shell Scripting", "Bash",

    # Web Frontend
    "React", "Angular", "Vue.js", "Next.js", "HTML", "CSS", "Bootstrap",
    "Tailwind CSS", "jQuery", "Redux", "Webpack", "Vite",

    # Web Backend
    "Node.js", "Django", "FastAPI", "Flask", "Spring Boot", "Express",
    "Laravel", "Ruby on Rails", "ASP.NET", "NestJS",

    # Mobile
    "React Native", "Flutter", "Android", "iOS", "Ionic", "Xamarin",

    # Databases
    "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
    "SQLite", "Oracle", "MSSQL", "Cassandra", "DynamoDB", "Firebase",
    "MariaDB", "Neo4j", "Supabase",

    # Cloud & DevOps
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Ansible",
    "Jenkins", "GitHub Actions", "CI/CD", "Linux", "Nginx", "Apache",
    "Helm", "Prometheus", "Grafana", "ELK Stack",

    # AI & ML
    "Machine Learning", "Deep Learning", "NLP", "Computer Vision",
    "scikit-learn", "TensorFlow", "PyTorch", "Keras", "OpenCV",
    "Hugging Face", "LangChain", "AI Agents", "LLM", "Prompt Engineering",
    "RAG", "Vector Databases", "MLOps", "Data Science",

    # Data & Analytics
    "Pandas", "NumPy", "Matplotlib", "Seaborn", "Tableau", "Power BI",
    "Excel", "Google Sheets", "Data Analysis", "Data Visualization",
    "Apache Spark", "Hadoop", "Airflow", "Kafka", "dbt",

    # Tools & Platforms
    "Git", "GitHub", "GitLab", "Bitbucket", "JIRA", "Confluence",
    "Postman", "Swagger", "Figma", "Adobe XD", "Photoshop", "Illustrator",
    "Canva", "MS Office", "Word", "PowerPoint",

    # Testing
    "Selenium", "Pytest", "Jest", "Cypress", "JUnit", "Postman",
    "Appium", "LoadRunner", "JMeter",

    # APIs & Protocols
    "REST APIs", "GraphQL", "gRPC", "WebSockets", "OAuth", "JWT",
    "Microservices", "Message Queues",

    # Blockchain
    "Blockchain", "Solidity", "Web3", "Ethereum", "Smart Contracts",

    # CRM & ERP
    "Salesforce", "SAP", "ServiceNow", "Power Automate", "Dynamics 365",
    "Tally ERP", "Zoho CRM", "HubSpot",

    # Design
    "UI/UX Design", "Wireframing", "Prototyping", "User Research",
    "Graphic Design", "Motion Graphics", "Video Editing",

    # Non-Technical / Business
    "Communication", "Leadership", "Project Management", "Team Management",
    "Agile", "Scrum", "Kanban", "Business Analysis", "Product Management",
    "Digital Marketing", "SEO", "SEM", "Google Ads", "Social Media Marketing",
    "Content Writing", "Copywriting", "Email Marketing", "Market Research",
    "Sales", "CRM", "Customer Service", "Negotiation", "Presentation",
    "MS Office", "Data Entry", "Reporting", "MIS Reporting", "Accounting",
    "Tally", "GST", "Payroll", "HR Management", "Recruitment",
    "Financial Analysis", "Budgeting", "Supply Chain", "Logistics",
    "Operations Management", "Quality Assurance", "Six Sigma", "Lean",

    # Technical Support
    "Technical Support", "Network Administration", "System Administration",
    "CCNA", "CCNP", "VMware", "Active Directory", "Linux Administration",
    "Windows Server", "Cybersecurity", "Ethical Hacking", "Penetration Testing",
    "Firewalls", "SIEM", "CEH", "CISSP",

    # Languages
    "Hindi", "English", "Tamil", "Telugu", "Kannada", "Malayalam",
    "Bengali", "Marathi", "Gujarati", "Punjabi",

    # Blue Collar / Field
    "Welding", "Electrical Wiring", "Plumbing", "HVAC", "Carpentry",
    "Painting", "Driving", "Heavy Equipment Operation", "Forklift",
    "Safety Awareness", "First Aid", "Tool Handling", "Machine Operation",
    "Quality Control", "Inventory Management", "Warehouse Management",
    "Physical Fitness", "Security Operations", "CCTV Monitoring",
]

# ── Known expansions map ──────────────────────────────────────────────────────
# Format: "lowercase raw" → "Canonical"
KNOWN_EXPANSIONS = {
    # Microsoft / MS prefix
    "ms excel":                    "Excel",
    "microsoft excel":             "Excel",
    "ms word":                     "Word",
    "microsoft word":              "Word",
    "ms powerpoint":               "PowerPoint",
    "microsoft powerpoint":        "PowerPoint",
    "ms office":                   "MS Office",
    "microsoft office":            "MS Office",
    "ms azure":                    "Azure",
    "microsoft azure":             "Azure",
    "ms sql":                      "MSSQL",
    "microsoft sql server":        "MSSQL",
    "ms sql server":               "MSSQL",
    "ms teams":                    "MS Teams",
    "ms project":                  "Project Management",

    # Cloud providers
    "amazon web services":         "AWS",
    "google cloud platform":       "GCP",
    "google cloud":                "GCP",
    "gcp cloud":                   "GCP",

    # JavaScript ecosystem
    "nodejs":                      "Node.js",
    "node js":                     "Node.js",
    "reactjs":                     "React",
    "react.js":                    "React",
    "react js":                    "React",
    "angularjs":                   "Angular",
    "angular.js":                  "Angular",
    "angular js":                  "Angular",
    "vuejs":                       "Vue.js",
    "vue js":                      "Vue.js",
    "nextjs":                      "Next.js",
    "next js":                     "Next.js",
    "expressjs":                   "Express",
    "express.js":                  "Express",
    "express js":                  "Express",
    "nestjs":                      "NestJS",
    "nest.js":                     "NestJS",
    "typescriptjs":                "TypeScript",
    "js":                          "JavaScript",

    # Databases
    "postgres":                    "PostgreSQL",
    "postgre":                     "PostgreSQL",
    "postgresdb":                  "PostgreSQL",
    "mongo":                       "MongoDB",
    "mongodb atlas":               "MongoDB",
    "elastic":                     "Elasticsearch",
    "elastic search":              "Elasticsearch",
    "dynamo":                      "DynamoDB",
    "dynamodb":                    "DynamoDB",
    "oracle db":                   "Oracle",
    "oracle database":             "Oracle",

    # DevOps / Infra
    "k8s":                         "Kubernetes",
    "k8":                          "Kubernetes",
    "docker container":            "Docker",
    "github action":               "GitHub Actions",
    "github ci":                   "GitHub Actions",
    "cicd":                        "CI/CD",
    "ci cd":                       "CI/CD",
    "continuous integration":      "CI/CD",
    "continuous deployment":       "CI/CD",
    "terraform iac":               "Terraform",

    # AI / ML
    "ml":                          "Machine Learning",
    "dl":                          "Deep Learning",
    "ai":                          "Machine Learning",
    "artificial intelligence":     "Machine Learning",
    "nlp":                         "NLP",
    "natural language processing": "NLP",
    "cv":                          "Computer Vision",
    "sklearn":                     "scikit-learn",
    "scikit learn":                "scikit-learn",
    "llms":                        "LLM",
    "large language model":        "LLM",
    "large language models":       "LLM",
    "llm models":                  "LLM",
    "ai agent":                    "AI Agents",
    "agentic ai":                  "AI Agents",
    "ai agents framework":         "AI Agents",
    "rag pipeline":                "RAG",
    "retrieval augmented generation": "RAG",
    "vector db":                   "Vector Databases",
    "vector database":             "Vector Databases",
    "prompt eng":                  "Prompt Engineering",
    "prompt engg":                 "Prompt Engineering",
    "generative ai":               "LLM",
    "gen ai":                      "LLM",

    # Data
    "powerbi":                     "Power BI",
    "ms power bi":                 "Power BI",
    "microsoft power bi":          "Power BI",
    "msbi":                        "Power BI",
    "apache spark":                "Apache Spark",
    "pyspark":                     "Apache Spark",
    "apache kafka":                "Kafka",
    "apache airflow":              "Airflow",

    # Blockchain
    "web 3":                       "Web3",
    "web 3.0":                     "Web3",
    "smart contract":              "Smart Contracts",
    "ethereum blockchain":         "Ethereum",

    # Mobile
    "react-native":                "React Native",
    "react native app":            "React Native",
    "flutter dart":                "Flutter",

    # Testing
    "selenium webdriver":          "Selenium",
    "pytest framework":            "Pytest",
    "unit testing":                "Pytest",
    "api testing":                 "Postman",

    # Business / Non-Tech
    "ms project":                  "Project Management",
    "project mgmt":                "Project Management",
    "project mgr":                 "Project Management",
    "digital mktg":                "Digital Marketing",
    "social media":                "Social Media Marketing",
    "social media mgmt":           "Social Media Marketing",
    "google analytics":            "Google Analytics",
    "google adwords":              "Google Ads",
    "seo optimization":            "SEO",
    "search engine optimization":  "SEO",
    "search engine marketing":     "SEM",
    "content mktg":                "Content Writing",
    "mis":                         "MIS Reporting",
    "mis excel":                   "MIS Reporting",
    "erp tally":                   "Tally ERP",
    "tally erp9":                  "Tally ERP",
    "tally prime":                 "Tally ERP",
    "accounting tally":            "Tally",
    "gst filing":                  "GST",
    "hr":                          "HR Management",
    "human resource":              "HR Management",
    "human resources":             "HR Management",
    "talent acquisition":          "Recruitment",
    "talent mgmt":                 "HR Management",
    "supply chain mgmt":           "Supply Chain",
    "supply chain management":     "Supply Chain",
    "quality control":             "Quality Assurance",
    "qa":                          "Quality Assurance",
    "qc":                          "Quality Control",
    "six sigma green belt":        "Six Sigma",
    "six sigma black belt":        "Six Sigma",

    # Security
    "ethical hacking":             "Ethical Hacking",
    "pen testing":                 "Penetration Testing",
    "penetration test":            "Penetration Testing",
    "network security":            "Cybersecurity",
    "information security":        "Cybersecurity",
    "infosec":                     "Cybersecurity",
    "cyber security":              "Cybersecurity",

    # Languages
    "english communication":       "English",
    "english speaking":            "English",
    "hindi speaking":              "Hindi",

    # Blue Collar
    "electrical":                  "Electrical Wiring",
    "plumber":                     "Plumbing",
    "ac repair":                   "HVAC",
    "air conditioning":            "HVAC",
    "welding fabrication":         "Welding",
    "tig welding":                 "Welding",
    "mig welding":                 "Welding",
    "driving license":             "Driving",
    "lmv":                         "Driving",
    "hmv":                         "Heavy Equipment Operation",
    "security guard":              "Security Operations",
    "cctv":                        "CCTV Monitoring",
    "inventory":                   "Inventory Management",
    "warehousing":                 "Warehouse Management",
    "forklift operator":           "Forklift",
}

FUZZY_THRESHOLD = 70

# ── Prefix decomposition ──────────────────────────────────────────────────────
# Handles compact variants like "msexcel", "microsoftword", "apachekafka"
# by splitting on known prefixes and re-trying KNOWN_EXPANSIONS / CANONICAL_SKILLS
KNOWN_PREFIXES = ["microsoft", "ms", "apache", "google", "amazon", "aws"]


def _compact(s: str) -> str:
    """Strip spaces, hyphens, dots → compact key.
    e.g. 'ms-excel' → 'msexcel', 'react.js' → 'reactjs'"""
    return re.sub(r"[\s\-\.]", "", s)


def _try_prefix_decompose(compact_key: str) -> str | None:
    """
    Split compact key by known prefix, then look up remainder.
    e.g. 'msexcel'       → prefix 'ms'        + remainder 'excel'   → 'ms excel'   → 'Excel'
         'microsoftword'  → prefix 'microsoft' + remainder 'word'    → 'ms word'    → 'Word'
         'apachekafka'    → prefix 'apache'    + remainder 'kafka'   → 'apache kafka' → 'Kafka'
         'mspowerbi'      → prefix 'ms'        + remainder 'powerbi' → remainder in KNOWN_EXPANSIONS → 'Power BI'
    """
    for prefix in KNOWN_PREFIXES:
        if compact_key.startswith(prefix) and len(compact_key) > len(prefix):
            remainder = compact_key[len(prefix):]          # e.g. "excel", "powerbi"

            # Try "prefix remainder" spaced → e.g. "ms excel"
            spaced = prefix + " " + remainder
            if spaced in KNOWN_EXPANSIONS:
                return KNOWN_EXPANSIONS[spaced]

            # Try remainder alone in KNOWN_EXPANSIONS → e.g. "powerbi" → "Power BI"
            if remainder in KNOWN_EXPANSIONS:
                return KNOWN_EXPANSIONS[remainder]

            # Try remainder exact match in canonical list
            for c in CANONICAL_SKILLS:
                if remainder == c.lower():
                    return c
    return None


def _fuzzy_match(raw: str) -> str | None:
    """RapidFuzz match against canonical list."""
    try:
        from rapidfuzz import fuzz, process
        result = process.extractOne(
            raw,
            CANONICAL_SKILLS,
            scorer=fuzz.token_sort_ratio,
            score_cutoff=FUZZY_THRESHOLD
        )
        return result[0] if result else None
    except ImportError:
        logger.warning("rapidfuzz not installed — fuzzy matching skipped")
        return None


def _groq_normalize(raw: str) -> str:
    """Call Groq to normalize a truly unknown skill. Returns canonical or title-cased raw."""
    try:
        from groq import Groq
        from backend.config import GROQ_API_KEY
        if not GROQ_API_KEY:
            return raw.title()
        client = Groq(api_key=GROQ_API_KEY)
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content":
                f'What is the standard canonical skill name for "{raw}" in the Indian job market? '
                f'Return only the canonical name as plain text. No explanation. No punctuation. '
                f'Examples: "MS Excel" → "Excel", "NodeJS" → "Node.js", "k8s" → "Kubernetes". '
                f'If it is already a proper canonical name, return it as-is with correct casing.'
            }],
            max_tokens=30,
            temperature=0.0,
        )
        result = response.choices[0].message.content.strip().strip('"').strip("'")
        logger.info("Groq normalized '%s' → '%s'", raw, result)
        return result if result else raw.title()
    except Exception as e:
        logger.error("Groq normalization failed for '%s': %s", raw, str(e))
        return raw.title()


def normalize_skill(raw: str, db: Session) -> str:
    """
    Normalize a raw skill name to canonical form.
    Layer 0: DB cache
    Layer 1a: Known expansions map (direct)
    Layer 1b: Compact key — strip dots/hyphens/spaces, retry expansions
    Layer 1c: Exact canonical match (case-insensitive)
    Layer 1d: Prefix decomposition — 'msexcel' → 'ms'+'excel' → 'ms excel' → 'Excel'
    Layer 2: RapidFuzz
    Layer 3: Groq (only for truly unknown skills)
    Always saves result to DB cache.
    """
    from backend.models.score import SkillNormCache

    if not raw or not raw.strip():
        return raw

    raw_clean = raw.strip()
    cache_key = raw_clean.lower()

    # Layer 0 — DB cache
    cached = db.query(SkillNormCache).filter(
        SkillNormCache.raw_name == cache_key
    ).first()
    if cached:
        return cached.canonical

    # Layer 1a — direct expansion lookup
    if cache_key in KNOWN_EXPANSIONS:
        canonical = KNOWN_EXPANSIONS[cache_key]
        _save_cache(cache_key, canonical, db)
        return canonical

    # Layer 1b — compact key (strip spaces, hyphens, dots) and retry
    compact_key = _compact(cache_key)
    if compact_key != cache_key and compact_key in KNOWN_EXPANSIONS:
        canonical = KNOWN_EXPANSIONS[compact_key]
        _save_cache(cache_key, canonical, db)
        return canonical

    # Layer 1c — exact canonical match (case-insensitive, also try compact)
    for c in CANONICAL_SKILLS:
        if cache_key == c.lower() or compact_key == c.lower():
            _save_cache(cache_key, c, db)
            return c

    # Layer 1d — prefix decomposition on compact key
    prefix_result = _try_prefix_decompose(compact_key)
    if prefix_result:
        _save_cache(cache_key, prefix_result, db)
        return prefix_result

    # Layer 2 — RapidFuzz
    fuzzy = _fuzzy_match(raw_clean)
    if fuzzy:
        _save_cache(cache_key, fuzzy, db)
        return fuzzy

    # Layer 3 — Groq
    canonical = _groq_normalize(raw_clean)
    # Post-process Groq result through rules — Groq may return "MS Excel" → "Excel"
    groq_lower = canonical.lower()
    groq_compact = _compact(groq_lower)
    if groq_lower in KNOWN_EXPANSIONS:
        canonical = KNOWN_EXPANSIONS[groq_lower]
    elif groq_compact in KNOWN_EXPANSIONS:
        canonical = KNOWN_EXPANSIONS[groq_compact]
    else:
        prefix_of_groq = _try_prefix_decompose(groq_compact)
        if prefix_of_groq:
            canonical = prefix_of_groq
        else:
            for c in CANONICAL_SKILLS:
                if groq_lower == c.lower():
                    canonical = c
                    break

    _save_cache(cache_key, canonical, db)
    return canonical


def _save_cache(raw_name: str, canonical: str, db: Session) -> None:
    """Save normalization result to DB cache."""
    from backend.models.score import SkillNormCache
    try:
        db.add(SkillNormCache(raw_name=raw_name, canonical=canonical))
        db.commit()
    except Exception:
        db.rollback()