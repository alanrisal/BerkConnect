// Service Worker for BerkConnect Push Notifications

const CACHE_NAME = 'schoolconnect-v1'

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// Push event - handle incoming push notifications
// IMPORTANT: iOS/Safari requires showing a notification immediately.
// If we don't show one, Safari revokes push permission for the site.
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received!', event)

  // Default notification data - always have a fallback
  let data = {
    title: 'BerkConnect',
    body: 'New notification from BerkConnect',
    url: '/',
  }

  // Try to parse push data if available
  if (event.data) {
    try {
      const pushData = event.data.json()
      console.log('[SW] Push data parsed:', pushData)
      data = { ...data, ...pushData }
    } catch (error) {
      console.log('[SW] JSON parse failed, trying text')
      // If JSON parsing fails, try to get text
      try {
        data.body = event.data.text() || data.body
      } catch (e) {
        console.log('[SW] Text parse also failed')
        // Use default data
      }
    }
  } else {
    console.log('[SW] No push data received')
  }

  console.log('[SW] Showing notification with data:', data)

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      notificationId: data.notificationId,
      clubId: data.clubId,
      postId: data.postId,
    },
    actions: [
      {
        action: 'open',
        title: 'View',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
    tag: data.tag || 'schoolconnect-notification',
    renotify: true,
  }

  // ALWAYS show notification - never return without showing one on iOS
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Notification click event - handle user interaction
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') {
    return
  }

  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(urlToOpen)
          return
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})

// Background sync for offline notification actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'mark-notification-read') {
    event.waitUntil(markNotificationsAsRead())
  }
})

async function markNotificationsAsRead() {
  // This would sync read status when back online
  // Implementation depends on IndexedDB storage of pending actions
}
