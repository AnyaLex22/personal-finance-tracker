//Import functions needed from theS SDKs needed
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

//WealthFlow's Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAc9W9cLtNdZidvJ6Sju3ubEoBXEIS9Zds",
    authDomain: "[wealthflow-12839.firebaseapp.com](http://wealthflow-12839.firebaseapp.com/)",
    projectId: "wealthflow-12839",
    storageBucket: "wealthflow-12839.firebasestorage.app",
    messagingSenderId: "577437120382",
    appId: "1:577437120382:web:1764f01d1ec0ad13d9652f"
};

//Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;