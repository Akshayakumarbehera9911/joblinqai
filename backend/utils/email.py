# ── Email Utility ─────────────────────────────────────────────────────────────────
# OTP emails: Resend API (HTTP-based, works on all platforms)
# Shortlist/Reject emails: Gmail SMTP

import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from backend.config import GMAIL_ADDRESS, GMAIL_APP_PASSWORD

logger = logging.getLogger(__name__)


def send_otp_email(to_email: str, otp_code: str, full_name: str) -> bool:
    """
    Send OTP verification email via Resend API (HTTP-based, not SMTP).
    Works on all hosting platforms — Railway, Render, AWS etc.
    Returns True on success, False on failure.
    """
    import urllib.request
    import json as _json
    from backend.config import RESEND_API_KEY

    if not RESEND_API_KEY:
        logger.error("RESEND_API_KEY not configured — cannot send OTP email")
        return False

    html_body = f"""
    <div style="font-family: DM Sans, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 28px;">
        <span style="font-size: 1.6rem; font-weight: 800; letter-spacing: -0.5px;">
          Job<span style="color: #0A66C2;">LinqAI</span>
        </span>
      </div>
      <div style="background: #fafafa; border: 1px solid #e8f0fa; border-radius: 12px; padding: 28px 24px;">
        <p style="font-size: 1rem; font-weight: 600; color: #1a1a2e; margin: 0 0 6px;">
          Hi {full_name},
        </p>
        <p style="font-size: 0.9rem; color: #666; margin: 0 0 24px; line-height: 1.6;">
          Use the code below to verify your JobLinqAI account. It expires in <strong>10 minutes</strong>.
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <div style="display: inline-block; background: #0A66C2; color: #fff;
                      font-size: 2rem; font-weight: 800; letter-spacing: 10px;
                      padding: 16px 32px; border-radius: 10px;">
            {otp_code}
          </div>
        </div>
        <p style="font-size: 0.8rem; color: #999; text-align: center; margin: 20px 0 0; line-height: 1.5;">
          If you did not create a JobLinqAI account, you can safely ignore this email.
        </p>
      </div>
      <p style="font-size: 0.75rem; color: #bbb; text-align: center; margin-top: 20px;">
        JobLinqAI · Kalam Institute of Technology, Berhampur
      </p>
    </div>
    """

    payload = _json.dumps({
        "from":    "JobLinqAI <onboarding@resend.dev>",
        "to":      [to_email],
        "subject": "Your JobLinqAI verification code",
        "html":    html_body,
        "text":    f"Hi {full_name},\n\nYour JobLinqAI verification code is: {otp_code}\n\nThis code expires in 10 minutes.",
    }).encode("utf-8")

    try:
        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=payload,
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type":  "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = _json.loads(resp.read())
            logger.info("OTP email sent via Resend to %s — id: %s", to_email, result.get("id"))
            return True
    except Exception as e:
        logger.error("Failed to send OTP email via Resend to %s: %s", to_email, str(e))
        return False


def send_shortlist_email(to_email: str, full_name: str, job_title: str, company_name: str) -> bool:
    """Send shortlist congratulations email to candidate."""
    if not GMAIL_ADDRESS or not GMAIL_APP_PASSWORD:
        return False

    subject = f"🎉 You've been shortlisted for {job_title}!"

    html_body = f"""
    <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 28px;">
        <span style="font-size: 1.6rem; font-weight: 800; letter-spacing: -0.5px;">
          Job<span style="color: #0A66C2;">LinqAI</span>
        </span>
      </div>
      <div style="background: #fafafa; border: 1px solid #e8f5e9; border-radius: 12px; padding: 28px 24px;">
        <p style="font-size: 1rem; font-weight: 600; color: #1a1a2e; margin: 0 0 6px;">Hi {full_name},</p>
        <p style="font-size: 0.9rem; color: #666; margin: 0 0 24px; line-height: 1.6;">
          Great news! You have been <strong style="color: #2e7d32;">shortlisted</strong> for the position of
          <strong>{job_title}</strong> at <strong>{company_name}</strong>.
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <div style="display: inline-block; background: #e8f5e9; color: #2e7d32;
                      font-size: 1.1rem; font-weight: 800; padding: 14px 28px; border-radius: 10px;">
            🎉 Shortlisted!
          </div>
        </div>
        <p style="font-size: 0.85rem; color: #555; line-height: 1.6;">
          The hiring team will be in touch with next steps. Keep an eye on your email and phone.
          You can also check your application status on JobLinqAI.
        </p>
      </div>
      <p style="font-size: 0.75rem; color: #bbb; text-align: center; margin-top: 20px;">
        JobLinqAI · Kalam Institute of Technology, Berhampur
      </p>
    </div>
    """

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"JobLinqAI <{GMAIL_ADDRESS}>"
        msg["To"]      = to_email
        msg.attach(MIMEText(
            f"Hi {full_name},\n\nCongratulations! You have been shortlisted for {job_title} at {company_name}.\n\nThe hiring team will be in touch soon.\n\nBest of luck!\nJobPortal",
            "plain"
        ))
        msg.attach(MIMEText(html_body, "html"))
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=10) as server:
            server.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_ADDRESS, to_email, msg.as_string())
        logger.info("Shortlist email sent to %s", to_email)
        return True
    except Exception as e:
        logger.error("Failed to send shortlist email to %s: %s", to_email, str(e))
        return False


def send_reject_email(to_email: str, full_name: str, job_title: str, company_name: str) -> bool:
    """Send rejection email to candidate."""
    if not GMAIL_ADDRESS or not GMAIL_APP_PASSWORD:
        return False

    subject = f"Your application for {job_title} — Update"

    html_body = f"""
    <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 28px;">
        <span style="font-size: 1.6rem; font-weight: 800; letter-spacing: -0.5px;">
          Job<span style="color: #0A66C2;">LinqAI</span>
        </span>
      </div>
      <div style="background: #fafafa; border: 1px solid #f0e4ea; border-radius: 12px; padding: 28px 24px;">
        <p style="font-size: 1rem; font-weight: 600; color: #1a1a2e; margin: 0 0 6px;">Hi {full_name},</p>
        <p style="font-size: 0.9rem; color: #666; margin: 0 0 24px; line-height: 1.6;">
          Thank you for applying for <strong>{job_title}</strong> at <strong>{company_name}</strong>.
          After careful consideration, the hiring team has decided not to move forward with your application at this time.
        </p>
        <p style="font-size: 0.85rem; color: #555; line-height: 1.6;">
          Don't be discouraged — keep your profile updated and keep applying.
          There are many more opportunities waiting for you on JobLinqAI.
        </p>
      </div>
      <p style="font-size: 0.75rem; color: #bbb; text-align: center; margin-top: 20px;">
        JobLinqAI · Kalam Institute of Technology, Berhampur
      </p>
    </div>
    """

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"JobLinqAI <{GMAIL_ADDRESS}>"
        msg["To"]      = to_email
        msg.attach(MIMEText(
            f"Hi {full_name},\n\nThank you for applying for {job_title} at {company_name}.\nUnfortunately, the hiring team has decided not to move forward at this time.\n\nKeep applying!\nJobPortal",
            "plain"
        ))
        msg.attach(MIMEText(html_body, "html"))
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=10) as server:
            server.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_ADDRESS, to_email, msg.as_string())
        logger.info("Reject email sent to %s", to_email)
        return True
    except Exception as e:
        logger.error("Failed to send reject email to %s: %s", to_email, str(e))
        return False