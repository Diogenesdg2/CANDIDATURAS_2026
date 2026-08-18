// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCO4JlGtyou0O0c3mHtHBXQl8_uw-Y4BRY",
  authDomain: "candidaturas-cfe7b.firebaseapp.com",
  projectId: "candidaturas-cfe7b",
  storageBucket: "candidaturas-cfe7b.firebasestorage.app",
  messagingSenderId: "516052338145",
  appId: "1:516052338145:web:d8660aea7163130ab8fea0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig); // <-- ESTA LINHA ESTAVA FALTANDO!

// Exporta o banco de dados
export const db = getFirestore(app);
