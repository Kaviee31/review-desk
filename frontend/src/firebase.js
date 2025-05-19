import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore"; // ✅ Add Firestore imports

const firebaseConfig = {
  apiKey: "AIzaSyCVCIw-_DoSqqcqyigJEHvmFIzKLGHuF_0",
  authDomain: "reviewdesk-ba1a7.firebaseapp.com",
  projectId: "reviewdesk-ba1a7",
  storageBucket: "reviewdesk-ba1a7.firebasestorage.app",
  messagingSenderId: "865538735231",
  appId: "1:865538735231:web:de6715564f46341c78d34a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Initialize Firebase Auth & Firestore
export const auth = getAuth(app);
export const db = getFirestore(app); // ✅ Export db
export { doc, getDoc };              // ✅ Export helpers if needed
