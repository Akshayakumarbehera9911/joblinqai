import urllib.request
import urllib.error
import json
import os

from fastapi import APIRouter

router = APIRouter()

@router.get("/test-email")
async def test_email():
    api_key = os.getenv("RESEND_API_KEY", "")
    if not api_key:
        return {"error": "RESEND_API_KEY not set in environment"}

    payload = json.dumps({
        "from":    "onboarding@resend.dev",
        "to":      ["delivered@resend.dev"],  # Resend's test address
        "subject": "Render Test — JobLinqAI",
        "html":    "<h2>It works from Render!</h2>",
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type":  "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            body = json.loads(response.read().decode("utf-8"))
            return {"status": "success", "response": body}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        return {"status": "http_error", "code": e.code, "response": body}
    except Exception as e:
        return {"status": "error", "message": str(e)}
