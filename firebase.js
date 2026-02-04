// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getMessaging } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-messaging.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBPi6dcr5sgh79g6Hxm2fXTNyd1aPRbm60",
    authDomain: "learninfos-cc4f8.firebaseapp.com",
    projectId: "learninfos-cc4f8",
    storageBucket: "learninfos-cc4f8.firebasestorage.app",
    messagingSenderId: "334373548096",
    appId: "1:334373548096:web:2d8434bdd7dbd711b5efa5",
    measurementId: "G-VYRN8Y395M",
    databaseURL: "https://learninfos-cc4f8-default-rtdb.europe-west1.firebasedatabase.app"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging and Database
export const messaging = getMessaging(app);
export const database = getDatabase(app);
export { firebaseConfig };