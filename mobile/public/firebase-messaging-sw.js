importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDxWEPQc0Mw3dKvFFB3QCid1ETNqfFlZXM",
  authDomain: "jobportal-555ca.firebaseapp.com",
  projectId: "jobportal-555ca",
  storageBucket: "jobportal-555ca.firebasestorage.app",
  messagingSenderId: "347953420222",
  appId: "1:347953420222:web:72cfbbad77497797700bef",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || "JobPortal", {
    body: body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: payload.fcmOptions?.link || "https://jobportal-mobile.onrender.com/applications" },
  });
});

// Click notification → open app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "https://jobportal-mobile.onrender.com/applications";
  event.waitUntil(clients.openWindow(url));
});