import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDxWEPQc0Mw3dKvFFB3QCid1ETNqfFlZXM",
  authDomain: "jobportal-555ca.firebaseapp.com",
  projectId: "jobportal-555ca",
  storageBucket: "jobportal-555ca.firebasestorage.app",
  messagingSenderId: "347953420222",
  appId: "1:347953420222:web:72cfbbad77497797700bef",
};

const VAPID_KEY = "BBkqtZkQTBDepO5sspZsXKP5V0Gneq6TTu4-T3ZkosXoNx5ruuhE47aMMY0VIz9ce-zM8YLjE4az2CASNPOeWzg";

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export async function requestFCMToken() {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    // Use the existing PWA service worker (sw.js) which now includes Firebase messaging
    const swReg = await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });

    return token || null;
  } catch (e) {
    console.warn("FCM token error:", e);
    return null;
  }
}

export function onForegroundMessage(callback) {
  return onMessage(messaging, callback);
}