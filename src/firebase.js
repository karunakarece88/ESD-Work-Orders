import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// These are placeholders. In a real scenario, these would be provided by the USER.
// Since the USER mentioned having separate passwords, I will assume Firebase Auth will be used.
// Firebase configuration using credentials provided by the USER
const firebaseConfig = {
    apiKey: "AIzaSyADO94lAUjFIwo65T7EdavGlCdMIXy_8Q0",
    authDomain: "esd-work-orders.firebaseapp.com",
    projectId: "esd-work-orders",
    storageBucket: "esd-work-orders.appspot.com",
    messagingSenderId: "666855774568",
    appId: "1:666855774568:web:356ea2e7abfe5897875edd"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
