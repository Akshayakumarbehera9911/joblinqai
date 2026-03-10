# ── Email Utility — Gmail SMTP ─────────────────────────────────────────────────
# Sends OTP verification emails via Gmail App Password
# Uses smtplib (stdlib) — no extra dependencies needed

import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from backend.config import GMAIL_ADDRESS, GMAIL_APP_PASSWORD

logger = logging.getLogger(__name__)


def send_otp_email(to_email: str, otp_code: str, full_name: str) -> bool:
    """
    Send OTP verification email to user.
    Returns True on success, False on failure (never raises — caller handles fallback).
    """
    if not GMAIL_ADDRESS or not GMAIL_APP_PASSWORD:
        logger.error("Gmail credentials not configured — cannot send OTP email")
        return False

    subject = "Your JobPortal verification code"

    html_body = f"""
    <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">

      <!-- Logo -->
      <div style="text-align: center; margin-bottom: 28px;">
        <span style="font-size: 1.6rem; font-weight: 800; letter-spacing: -0.5px;">
          Job<span style="color: #E8398A;">Portal</span>
        </span>
      </div>

      <!-- Card -->
      <div style="background: #fafafa; border: 1px solid #f0e4ea; border-radius: 12px; padding: 28px 24px;">
        <p style="font-size: 1rem; font-weight: 600; color: #1a1a2e; margin: 0 0 6px;">
          Hi {full_name},
        </p>
        <p style="font-size: 0.9rem; color: #666; margin: 0 0 24px; line-height: 1.6;">
          Use the code below to verify your JobPortal account. It expires in <strong>10 minutes</strong>.
        </p>

        <!-- OTP Box -->
        <div style="text-align: center; margin: 24px 0;">
          <div style="display: inline-block; background: #E8398A; color: #fff;
                      font-size: 2rem; font-weight: 800; letter-spacing: 10px;
                      padding: 16px 32px; border-radius: 10px;">
            {otp_code}
          </div>
        </div>

        <p style="font-size: 0.8rem; color: #999; text-align: center; margin: 20px 0 0; line-height: 1.5;">
          If you didn't create a JobPortal account, you can safely ignore this email.
        </p>
      </div>

      <p style="font-size: 0.75rem; color: #bbb; text-align: center; margin-top: 20px;">
        JobPortal · Kalam Institute of Technology, Berhampur
      </p>
    </div>
    """

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"JobPortal <{GMAIL_ADDRESS}>"
        msg["To"]      = to_email

        # Plain text fallback
        text_part = MIMEText(
            f"Hi {full_name},\n\nYour JobPortal verification code is: {otp_code}\n\nThis code expires in 10 minutes.\n\nIf you didn't create a JobPortal account, ignore this email.",
            "plain"
        )
        html_part = MIMEText(html_body, "html")

        msg.attach(text_part)
        msg.attach(html_part)

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_ADDRESS, to_email, msg.as_string())

        logger.info("OTP email sent to %s", to_email)
        return True

    except Exception as e:
        logger.error("Failed to send OTP email to %s: %s", to_email, str(e))
        return False