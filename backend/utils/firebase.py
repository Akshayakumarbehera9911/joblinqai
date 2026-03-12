import logging
import os
import json

logger = logging.getLogger(__name__)

def _init_firebase():
    import firebase_admin
    from firebase_admin import credentials
    if not firebase_admin._apps:
        creds_json = os.environ.get("FIREBASE_CREDENTIALS")
        if not creds_json:
            logger.error("FIREBASE_CREDENTIALS env var not set")
            return False
        cred = credentials.Certificate(json.loads(creds_json))
        firebase_admin.initialize_app(cred)
    return True

def send_push(token: str, title: str, body: str) -> bool:
    """Send push to a single token. Returns True on success."""
    if not token:
        return False
    try:
        if not _init_firebase():
            return False
        from firebase_admin import messaging
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
        logger.error("Push failed: %s", str(e))
        return False

def send_push_to_candidate(candidate_id: int, title: str, body: str, db) -> int:
    """Send push to ALL devices of a candidate.
    Only removes tokens that Firebase explicitly rejects as invalid/unregistered."""
    from firebase_admin.exceptions import FirebaseError
    from backend.models.candidate import CandidateFCMToken

    tokens = db.query(CandidateFCMToken).filter(
        CandidateFCMToken.candidate_id == candidate_id
    ).all()

    if not tokens:
        logger.warning("No FCM tokens found for candidate_id=%d", candidate_id)
        return 0

    if not _init_firebase():
        return 0

    from firebase_admin import messaging

    sent = 0
    stale = []
    for t in tokens:
        try:
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
                token=t.token,
            )
            messaging.send(message)
            logger.info("Push sent to candidate=%d token=%s...", candidate_id, t.token[:20])
            sent += 1
        except FirebaseError as e:
            # Only mark as stale if token is invalid/unregistered
            if "UNREGISTERED" in str(e) or "INVALID_ARGUMENT" in str(e):
                stale.append(t.id)
                logger.warning("Stale token removed: %s", str(e))
            else:
                logger.error("Firebase error (token kept): %s", str(e))
        except Exception as e:
            logger.error("Unexpected push error: %s", str(e))

    if stale:
        db.query(CandidateFCMToken).filter(
            CandidateFCMToken.id.in_(stale)
        ).delete(synchronize_session=False)
        db.commit()

    return sent