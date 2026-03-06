import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDk-2Dh6xr2G4_pu7RCaFnglSL_p83DXfg",
  authDomain: "startrekrpg-40ef7.firebaseapp.com",
  projectId: "startrekrpg-40ef7",
  storageBucket: "startrekrpg-40ef7.firebasestorage.app",
  messagingSenderId: "394277791161",
  appId: "1:394277791161:web:7735bfb756d6c975ff8268",
  measurementId: "G-CZYFKPTMV0"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app)

export { app, db, storage, auth };

