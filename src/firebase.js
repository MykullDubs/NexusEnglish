// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCfjzFY_yZQv66hF_Ob9-wHk1klKBe5rHw",
  authDomain: "nexusenglish-3e9c3.firebaseapp.com",
  databaseURL: "https://nexusenglish-3e9c3-default-rtdb.firebaseio.com",
  projectId: "nexusenglish-3e9c3",
  storageBucket: "nexusenglish-3e9c3.firebasestorage.app",
  messagingSenderId: "18259366717",
  appId: "1:18259366717:web:5cd2e6239f58b18b9f6b54",
  measurementId: "G-YX9PTFX8G5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
