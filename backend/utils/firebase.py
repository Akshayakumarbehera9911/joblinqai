import logging
import os

logger = logging.getLogger(__name__)

def send_push(token: str, title: str, body: str) -> bool:
    """Send a push notification to a single FCM token. Returns True on success."""
    if not token:
        return False
    try:
        import firebase_admin
        from firebase_admin import credentials, messaging

        # Initialize only once
        if not firebase_admin._apps:
            cred_path = os.path.join(os.path.dirname(__file__), "..", "firebase-service-account.json")
            cred = credentials.Certificate(os.path.abspath(cred_path))
            firebase_admin.initialize_app(cred)

        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            webpush=messaging.WebpushConfig(
                notification=messaging.WebpushNotification(
                    title=title,
                    body=body,
                    icon="/icons/icon-192.png",
                ),
                fcm_options=messaging.WebpushFCMOptions(
                    link="https://jobportal-mobile.onrender.com/applications"
                ),
            ),
            token=token,
        )
        messaging.send(message)
        logger.info("Push sent: %s", title)
        return True
    except Exception as e:
        logger.error("Push failed: %s", str(e))
        return False