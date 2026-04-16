// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDTJcU5KagnHY258towKF1VCudqwU17ong",
  authDomain: "aisymp2.firebaseapp.com",
  projectId: "aisymp2",
  storageBucket: "aisymp2.firebasestorage.app",
  messagingSenderId: "850767444565",
  appId: "1:850767444565:web:c5c2852bc90ebac0a732dc",
  measurementId: "G-K014KPMV09"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Initialize analytics (safely handle SSR environments just in case)
let analytics;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

export { app, analytics, db };
