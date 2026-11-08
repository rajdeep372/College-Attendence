const CACHE_NAME = 'academiasync-v3';
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon.svg',
  '/icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests and skip Next.js dev server hot-reloads / API calls
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Do not intercept API requests or internal Next.js dev server endpoints
  if (url.pathname.startsWith('/api') || url.pathname.includes('_next/webpack-hmr')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached and refresh in background
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse.clone());
              });
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // If HTML navigation request fails while offline, serve offline.html fallback
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html').then((offlineRes) => {
              return offlineRes || caches.match('/');
            });
          }
        });
    })
  );
});

// ============================================================================
// NATIVE MOBILE & DESKTOP BACKGROUND PUSH NOTIFICATIONS
// ============================================================================

self.addEventListener('push', (event) => {
  let payload = {
    title: 'Upcoming Class Alert!',
    body: 'Your scheduled academic class starts in 10 minutes.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: { url: '/dashboard' },
    tag: 'class-alert'
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    } catch (e) {
      payload.body = event.data.text() || payload.body;
    }
  }

  const title = payload.title || 'AcademiaSync Alert';
  const options = {
    body: payload.body,
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/icon-192x192.png',
    vibrate: [250, 100, 250, 100, 250],
    tag: payload.tag || 'academiasync-class-alert',
    renotify: true,
    data: payload.data || { url: '/dashboard' },
    actions: [
      { action: 'open', title: 'Open Dashboard' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if a window matching the origin is already open
      for (const client of windowClients) {
        if ('focus' in client) {
          if (client.url.includes(targetUrl) || client.url.includes('/dashboard')) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
      }
      // If not open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
