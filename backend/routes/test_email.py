import os
import resend

from fastapi import APIRouter

router = APIRouter()

@router.get("/test-email")
async def test_email():
    api_key = os.getenv("RESEND_API_KEY", "")
    if not api_key:
        return {"error": "RESEND_API_KEY not set in environment"}

    try:
        resend.api_key = api_key
        params = {
            "from": "onboarding@resend.dev",
            "to":   ["delivered@resend.dev"],
            "subject": "Render Test — JobLinqAI",
            "html": "<h2>It works from Render!</h2>",
        }
        email = resend.Emails.send(params)
        return {"status": "success", "response": email}
    except Exception as e:
        return {"status": "error", "message": str(e)}