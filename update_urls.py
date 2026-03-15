import os
import re

OLD_AZURE = "https://jobportal-api-a2dcfwh8dfcaesf4.southindia-01.azurewebsites.net"
OLD_RENDER_MOBILE = "https://jobportal-mobile.onrender.com"
OLD_RENDER_API = "https://jobportal-q9ii.onrender.com"

NEW_BACKEND = "https://joblinqai-production.up.railway.app"
# Cloudflare PWA URL - update this later when Cloudflare is set up
NEW_MOBILE = "https://joblinqai-production.up.railway.app"

FILES = [
    "mobile/src/api/client.js",
    "mobile/src/pages/candidate/Dashboard.jsx",
    "mobile/src/components/EmptyState.jsx",
    "mobile/src/App.jsx",
    "mobile/src/pages/jobs/Map.jsx",
    "frontend/static/js/api.js",
    "frontend/templates/candidate/profile.html",
    "frontend/templates/candidate/applications.html",
    "frontend/templates/candidate/dashboard.html",
    "frontend/templates/account/settings.html",
    "frontend/templates/hr/dashboard.html",
    "frontend/templates/jobs/search.html",
    "frontend/templates/jobs/detail.html",
    "frontend/templates/jobs/map.html",
    "frontend/templates/admin/dashboard.html",
    "frontend/templates/base.html",
    "backend/utils/firebase.py",
]

def update_file(path):
    if not os.path.exists(path):
        print(f"SKIP (not found): {path}")
        return
    
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    original = content
    content = content.replace(OLD_AZURE, NEW_BACKEND)
    content = content.replace(OLD_RENDER_API, NEW_BACKEND)
    content = content.replace(OLD_RENDER_MOBILE, NEW_MOBILE)
    
    if content != original:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"UPDATED: {path}")
    else:
        print(f"NO CHANGE: {path}")

for f in FILES:
    update_file(f)

print("\nDone. Review changes then: git add . && git commit -m 'update URLs to Railway' && git push")
