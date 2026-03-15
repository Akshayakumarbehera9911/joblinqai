importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCsAWFIruPsMQ1-WONbn938YHSMpCUCdBc",
  authDomain: "joblinqai-6906c.firebaseapp.com",
  projectId: "joblinqai-6906c",
  storageBucket: "joblinqai-6906c.firebasestorage.app",
  messagingSenderId: "678654942688",
  appId: "1:678654942688:web:1f4c11210db9f5f2451f85",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || "JobPortal", {
    body: body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: payload.fcmOptions?.link || "https://joblinqai.pages.dev/applications" },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "https://joblinqai.pages.dev/applications";
  event.waitUntil(clients.openWindow(url));
});

/* ── PWA Cache ── */
const CACHE_NAME = "joblinqai-v1";

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([
        "/icons/icon-192.png",
        "/icons/icon-512.png",
      ]);
    })
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Cache icons only
  if (url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
    return;
  }

  // Cache CDN resources — fix: clone before caching, return original
  if (
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("gstatic.com") ||
    url.hostname.includes("unpkg.com") ||
    url.hostname.includes("cdnjs.cloudflare.com")
  ) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const toCache = response.clone(); // clone for cache, return original
            caches.open(CACHE_NAME).then(c => c.put(event.request, toCache));
          }
          return response; // return original — not consumed
        });
      })
    );
    return;
  }
});