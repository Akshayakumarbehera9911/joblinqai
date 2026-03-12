import logging
import os
import json

logger = logging.getLogger(__name__)

def _get_messaging():
    import firebase_admin
    from firebase_admin import credentials, messaging
    if not firebase_admin._apps:
        creds_json = os.environ.get("FIREBASE_CREDENTIALS")
        if not creds_json:
            logger.error("FIREBASE_CREDENTIALS env var not set")
            return None
        cred = credentials.Certificate(json.loads(creds_json))
        firebase_admin.initialize_app(cred)
    from firebase_admin import messaging
    return messaging

def send_push(token: str, title: str, body: str) -> bool:
    """Send push to a single token. Returns True on success, False if token is stale."""
    if not token:
        return False
    try:
        messaging = _get_messaging()
        if not messaging:
            return False
        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            webpush=messaging.WebpushConfig(
                notification=messaging.WebpushNotification(
                    title=title, body=body, icon="/icons/icon-192.png",
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
        logger.error("Push failed for token: %s", str(e))
        return False

def send_push_to_candidate(candidate_id: int, title: str, body: str, db) -> int:
    """Send push to ALL devices of a candidate. Returns count of successful sends.
    Automatically removes stale tokens that FCM rejects."""
    from backend.models.candidate import CandidateFCMToken
    tokens = db.query(CandidateFCMToken).filter(
        CandidateFCMToken.candidate_id == candidate_id
    ).all()

    if not tokens:
        return 0

    sent = 0
    stale = []
    for t in tokens:
        success = send_push(t.token, title, body)
        if success:
            sent += 1
        else:
            stale.append(t.id)

    # Remove stale tokens
    if stale:
        db.query(CandidateFCMToken).filter(
            CandidateFCMToken.id.in_(stale)
        ).delete(synchronize_session=False)
        db.commit()
        logger.info("Removed %d stale FCM tokens for candidate %d", len(stale), candidate_id)

    return sent