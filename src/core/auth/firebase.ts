import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// TODO: Replace with your actual Firebase project configuration
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForNow",
    authDomain:
        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
        "taskroot-prototype.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "taskroot-prototype",
    storageBucket:
        import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
        "taskroot-prototype.appspot.com",
    messagingSenderId:
        import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
    appId:
        import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef123456",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("https://www.googleapis.com/auth/calendar");
