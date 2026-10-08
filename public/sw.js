// public/sw.js

// Import Firebase
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDRgCoxkmXmR2GdX4ckRp0KCjS8R4LYedA",
  authDomain: "rs-notification-ee025.firebasestorage.app",
  projectId: "rs-notification-ee025",
  storageBucket: "rs-notification-ee025.firebasestorage.app",
  messagingSenderId: "219935078032",
  appId: "1:219935078032:web:64c49a01d4cf7337574a15"
};

// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
  console.log('Service Worker: Firebase initialized successfully');
} catch (error) {
  console.error('Service Worker: Firebase initialization failed:', error);
}

const messaging = firebase.messaging();
console.log('Service Worker: Messaging initialized');

// Background message handler — payload is data-only so browser won't auto-show.
// We show exactly one notification here.
messaging.onBackgroundMessage((payload) => {
  // Notify all open tabs to refetch their data
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    clients.forEach(client => client.postMessage({ type: 'REFETCH' }));
  });
  console.log('Service Worker: Received background message', payload);

  const title = payload.data?.title || 'RS Private Hire';
  const options = {
    body: payload.data?.body || 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: payload.data || {},
  };

  return self.registration.showNotification(title, options);
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Service Worker Installation - CRITICAL FOR ACTIVATION
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install event');
  
  // Force activation of this service worker immediately
  event.waitUntil(
    self.skipWaiting().then(() => {
      console.log('Service Worker: skipWaiting() completed');
    })
  );
});

// Service Worker Activation - CRITICAL
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate event');
  
  // Take control of all clients immediately
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clean up old caches if needed
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName.startsWith('firebase-messaging')) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ]).then(() => {
      console.log('Service Worker: Now controlling all clients');
      // Send message to all clients that SW is ready
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_READY',
            message: 'Service Worker is now active'
          });
        });
      });
    })
  );
});

// Listen for messages from the page
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received from client:', event.data);
  
  if (event.data.type === 'GET_SW_STATUS') {
    event.source.postMessage({
      type: 'SW_STATUS',
      status: 'ACTIVE',
      scope: self.registration ? self.registration.scope : 'unknown'
    });
  }
});

console.log('Service Worker: Script loaded successfully');