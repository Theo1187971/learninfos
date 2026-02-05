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

// Gérer le clic sur la notification
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || 'https://theo1187971.github.io/learninfos/';
    event.waitUntil(clients.openWindow(url));
});
