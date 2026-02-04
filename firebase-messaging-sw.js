// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/12.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyBPi6dcr5sgh79g6Hxm2fXTNyd1aPRbm60",
    authDomain: "learninfos-cc4f8.firebaseapp.com",
    projectId: "learninfos-cc4f8",
    storageBucket: "learninfos-cc4f8.firebasestorage.app",
    messagingSenderId: "334373548096",
    appId: "1:334373548096:web:2d8434bdd7dbd711b5efa5"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('Background message received:', payload);
    
    // Extract data from payload (data-only messages)
    const notificationTitle = payload.data?.title || 'Nouvelles actualités';
    const notificationBody = payload.data?.body || 'De nouveaux articles disponibles !';
    const notificationUrl = payload.data?.url || 'https://theo1187971.github.io/learninfos/';
    
    const notificationOptions = {
        body: notificationBody,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'learninfos-notification', // Tag unique pour éviter les doublons
        requireInteraction: false,
        data: {
            url: notificationUrl
        }
    };
    
    // Fermer les anciennes notifications avec le même tag
    return self.registration.getNotifications({ tag: 'learninfos-notification' })
        .then(notifications => {
            notifications.forEach(notification => notification.close());
            return self.registration.showNotification(notificationTitle, notificationOptions);
        });
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/';
    event.waitUntil(clients.openWindow(url));
});
