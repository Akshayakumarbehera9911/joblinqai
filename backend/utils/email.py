# ── Email Utility — Resend API ─────────────────────────────────────────────────
# Sends emails via Resend HTTP API (works on Render free tier)
# Uses resend SDK — add 'resend' to requirements.txt

import logging
import os
import resend

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL     = "JobLinqAI <noreply@joblinqai.online>"  # replace with verified domain later


def _send(to_email: str, subject: str, html_body: str, text_body: str) -> bool:
    """Internal helper — sends via Resend. Returns True on success, False on failure."""
    if not RESEND_API_KEY:
        logger.error("RESEND_API_KEY not configured — cannot send email")
        return False
    try:
        resend.api_key = RESEND_API_KEY
        resend.Emails.send({
            "from":    FROM_EMAIL,
            "to":      [to_email],
            "subject": subject,
            "html":    html_body,
            "text":    text_body,
        })
        logger.info("Email sent to %s", to_email)
        return True
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to_email, str(e))
        return False


def send_otp_email(to_email: str, otp_code: str, full_name: str) -> bool:
    """Send OTP verification email to user."""
    subject = "Your JobLinqAI verification code"

    html_body = f"""
    <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">

      <!-- Logo -->
      <div style="text-align: center; margin-bottom: 28px;">
        <span style="font-size: 1.6rem; font-weight: 800; letter-spacing: -0.5px;">
          Job<span style="color: #0A66C2;">LinqAI</span>
        </span>
      </div>

      <!-- Card -->
      <div style="background: #fafafa; border: 1px solid #e5e7eb; border-radius: 12px; padding: 28px 24px;">
        <p style="font-size: 1rem; font-weight: 600; color: #1a1a2e; margin: 0 0 6px;">
          Hi {full_name},
        </p>
        <p style="font-size: 0.9rem; color: #666; margin: 0 0 24px; line-height: 1.6;">
          Use the code below to verify your JobLinqAI account. It expires in <strong>10 minutes</strong>.
        </p>

        <!-- OTP Box -->
        <div style="text-align: center; margin: 24px 0;">
          <div style="display: inline-block; background: #0A66C2; color: #fff;
                      font-size: 2rem; font-weight: 800; letter-spacing: 10px;
                      padding: 16px 32px; border-radius: 10px;">
            {otp_code}
          </div>
        </div>

        <p style="font-size: 0.8rem; color: #999; text-align: center; margin: 20px 0 0; line-height: 1.5;">
          If you didn't create a JobLinqAI account, you can safely ignore this email.
        </p>
      </div>

      <p style="font-size: 0.75rem; color: #bbb; text-align: center; margin-top: 20px;">
        JobLinqAI · Connect Smarter, Hire Faster
      </p>
    </div>
    """

    text_body = (
        f"Hi {full_name},\n\n"
        f"Your JobLinqAI verification code is: {otp_code}\n\n"
        f"This code expires in 10 minutes.\n\n"
        f"If you didn't create a JobLinqAI account, ignore this email."
    )

    return _send(to_email, subject, html_body, text_body)


def send_shortlist_email(to_email: str, full_name: str, job_title: str, company_name: str) -> bool:
    """Send shortlist congratulations email to candidate."""
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
        JobLinqAI · Connect Smarter, Hire Faster
      </p>
    </div>
    """

    text_body = (
        f"Hi {full_name},\n\n"
        f"Congratulations! You have been shortlisted for {job_title} at {company_name}.\n\n"
        f"The hiring team will be in touch soon.\n\nBest of luck!\nJobLinqAI"
    )

    return _send(to_email, subject, html_body, text_body)


def send_reject_email(to_email: str, full_name: str, job_title: str, company_name: str) -> bool:
    """Send rejection email to candidate."""
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
        JobLinqAI · Connect Smarter, Hire Faster
      </p>
    </div>
    """

    text_body = (
        f"Hi {full_name},\n\n"
        f"Thank you for applying for {job_title} at {company_name}.\n"
        f"Unfortunately, the hiring team has decided not to move forward at this time.\n\n"
        f"Keep applying!\nJobLinqAI"
    )

    return _send(to_email, subject, html_body, text_body)