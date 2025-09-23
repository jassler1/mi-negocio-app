// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // <-- ¡Importa esto!

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBlrpo9ukHQXpzXfRH3uDddG66hn7576eU",
  authDomain: "negocio-app-2025.firebaseapp.com",
  projectId: "negocio-app-2025",
  storageBucket: "negocio-app-2025.firebasestorage.app",
  messagingSenderId: "395164453267",
  appId: "1:395164453267:web:6b04216782f2e468684066",
  measurementId: "G-CZECFKG4KY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export Firestore and Auth
const db = getFirestore(app);
const auth = getAuth(app); // <-- ¡Inicializa esto!

export { db, auth }; // <-- ¡Y exporta auth también!