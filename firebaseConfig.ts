// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDW9nR83Owick9VLSX2_FCdtI-QyOOx1k0",
  authDomain: "doora-760da.firebaseapp.com",
  projectId: "doora-760da",
  storageBucket: "doora-760da.firebasestorage.app",
  messagingSenderId: "1061627889720",
  appId: "1:1061627889720:web:2a588695c208ca6f5cbecd"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;