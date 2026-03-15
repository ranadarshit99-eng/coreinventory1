import asyncio
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings
import logging

logger = logging.getLogger(__name__)

def send_otp_email_sync(to_email: str, otp: str, purpose: str = "login"):
    """Send OTP email synchronously via SMTP."""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning(f"[MOCK EMAIL] OTP {otp} to {to_email} (SMTP not configured)")
        print(f"\n{'='*50}")
        print(f"MOCK OTP EMAIL")
        print(f"To: {to_email}")
        print(f"OTP Code: {otp}")
        print(f"Purpose: {purpose}")
        print(f"{'='*50}\n")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"CoreInventory — Your OTP Code: {otp}"
        msg["From"] = settings.SMTP_FROM
        msg["To"] = to_email

        action = "sign in to" if purpose == "login" else "reset your password on"

        html = f"""
        <html>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6f8; padding: 40px 0;">
          <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
            <div style="background: #1a2332; padding: 32px 40px;">
              <h1 style="color: #fff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">
                📦 CoreInventory
              </h1>
              <p style="color: #94a3b8; margin: 6px 0 0; font-size: 13px;">Inventory Management System</p>
            </div>
            <div style="padding: 40px;">
              <p style="color: #374151; font-size: 15px; margin: 0 0 20px;">
                You requested an OTP to {action} CoreInventory.
              </p>
              <div style="background: #f0f9ff; border: 2px dashed #0ea5e9; border-radius: 10px; padding: 24px; text-align: center; margin: 24px 0;">
                <p style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px;">Your One-Time Password</p>
                <p style="color: #0f172a; font-size: 40px; font-weight: 800; letter-spacing: 10px; margin: 0; font-family: monospace;">{otp}</p>
              </div>
              <p style="color: #94a3b8; font-size: 12px; margin: 16px 0 0;">
                ⏱ This OTP expires in {settings.OTP_EXPIRE_MINUTES} minutes. Do not share it with anyone.
              </p>
            </div>
            <div style="background: #f8fafc; padding: 20px 40px; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 11px; margin: 0; text-align: center;">
                © CoreInventory. If you didn't request this, ignore this email.
              </p>
            </div>
          </div>
        </body>
        </html>
        """

        text = f"Your CoreInventory OTP is: {otp}\nExpires in {settings.OTP_EXPIRE_MINUTES} minutes."
        msg.attach(MIMEText(text, "plain"))
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM, to_email, msg.as_string())

        logger.info(f"OTP email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send OTP email: {e}")
        return False

async def send_otp_email(to_email: str, otp: str, purpose: str = "login"):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, send_otp_email_sync, to_email, otp, purpose)

async def send_otp_sms(to_phone: str, otp: str, purpose: str = "login"):
    """Send OTP via SMS using Twilio."""
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        logger.warning(f"[MOCK SMS] OTP {otp} to {to_phone}")
        print(f"\n{'='*50}")
        print(f"MOCK OTP SMS")
        print(f"To: {to_phone}")
        print(f"OTP Code: {otp}")
        print(f"{'='*50}\n")
        return True

    try:
        from twilio.rest import Client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        message = client.messages.create(
            body=f"Your CoreInventory OTP: {otp}. Expires in {settings.OTP_EXPIRE_MINUTES} minutes.",
            from_=settings.TWILIO_FROM_NUMBER,
            to=to_phone
        )
        logger.info(f"OTP SMS sent to {to_phone}: {message.sid}")
        return True
    except Exception as e:
        logger.error(f"Failed to send SMS: {e}")
        return False
