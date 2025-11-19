// src/firebaseConfig.js
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'


const firebaseConfig = {
    apiKey: API-KEY,
    authDomain: "smart-bus-pavan.firebaseapp.com",
    projectId: "smart-bus-pavan",
    storageBucket: "smart-bus-pavan.firebasestorage.app",
    messagingSenderId: "55233358832",
    appId: "1:55233358832:web:b9eda42f8b62647bff8b35",
    measurementId: "G-NJ3GDGTCEH"
  };

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)