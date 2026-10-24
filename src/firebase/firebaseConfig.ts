import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDk-2Dh6xr2G4_pu7RCaFnglSL_p83DXfg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "startrekrpg-40ef7.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "startrekrpg-40ef7",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "startrekrpg-40ef7.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "394277791161",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:394277791161:web:7735bfb756d6c975ff8268",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-CZYFKPTMV0"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app)

const emulatorHost = import.meta.env.VITE_FIREBASE_EMULATOR_HOST;
if (emulatorHost) {
  connectAuthEmulator(auth, `http://${emulatorHost}:${import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_PORT || 9099}`, { disableWarnings: true });
  connectFirestoreEmulator(db, emulatorHost, Number(import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_PORT || 8080));
  connectStorageEmulator(storage, emulatorHost, Number(import.meta.env.VITE_FIREBASE_STORAGE_EMULATOR_PORT || 9199));
}

export { app, db, storage, auth };

