/**
 * Firebase client SDK initializer for server-side (Vercel serverless) use.
 * Prevents duplicate app initialization across hot-reloaded functions.
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            "AIzaSyDk-2Dh6xr2G4_pu7RCaFnglSL_p83DXfg",
  authDomain:        "startrekrpg-40ef7.firebaseapp.com",
  projectId:         "startrekrpg-40ef7",
  storageBucket:     "startrekrpg-40ef7.firebasestorage.app",
  messagingSenderId: "394277791161",
  appId:             "1:394277791161:web:7735bfb756d6c975ff8268",
};

export function getServerDb() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getFirestore(app);
}
