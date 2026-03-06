// seedPlanets.ts
import { initializeApp } from "firebase/app";
import { getFirestore, setDoc, doc } from "firebase/firestore";
import planets from "./src/data/planetsData.json" with { type: "json" };

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

const seed = async () => {
  try {
    for (const [planetId, planetData] of Object.entries(planets)) {
      await setDoc(doc(db, "planets", planetId), planetData);
      console.log(`✅ Seeded planet: ${planetId}`);
    }
    console.log("🌌 All planets seeded!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding planets:", error);
    process.exit(1);
  }
};

seed();

