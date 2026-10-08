// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Your Firebase configuration (same as above)
firebase.initializeApp({
  apiKey: "AIzaSyDRgCoxkmXmR2GdX4ckRp0KCjS8R4LYedA",
  authDomain: "rs-notification-ee025.firebaseapp.com",
  projectId: "rs-notification-ee025",
  storageBucket: "rs-notification-ee025.firebasestorage.app",
  messagingSenderId: "219935078032",
  appId: "1:219935078032:web:64c49a01d4cf7337574a15"
});

const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {

  
  // Customize notification
  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data || {}, // Pass any custom data
    tag: payload.data?.tag || 'default' // Group notifications
  };

  // Show notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {

  
  event.notification.close();
  
  // Handle notification click - you can open specific URL
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there's already a window/tab open with the target URL
        for (let client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window/tab is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});