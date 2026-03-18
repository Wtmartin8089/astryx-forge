import { initializeApp } from "firebase/app";
import { getFirestore, addDoc, collection, serverTimestamp } from "firebase/firestore";

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

const creatures = [
  {
    name: "K'ulak",
    type: "Pack hunters, dog-like with bird-like wings, warm-blooded",
    size: "300kg, 6 meters",
    form: "4 legs, 2 ears, stone-colored short fur, 2 visible eyes",
    attributes: "Fitness 3 (Strength 4), Coordination 3, Presence 3, Instinct 3",
    baseMovement: "20 walking, 30 flying",
    resistance: "5",
    specialAbilities: "Excellent night vision and smell, able to disappear and reappear",
    weapons: "Claws (4 damage), Bite (3 damage)",
    description: "Mostly domesticated, but some remain wild. In the wild, they travel and hunt in packs and can be highly aggressive. When domesticated, they are extremely loyal and will guard anything they are ordered to protect.",
    createdBy: "System",
    isHostile: false,
    isDomesticated: true,
  },
  {
    name: "Asmodeus",
    type: "Grazer, bull-like with long red shaggy fur",
    size: "2000kg, 8 meters",
    form: "3 horns on head, red eyes, 4 legs, spiny tail",
    attributes: "",
    baseMovement: "",
    resistance: "",
    specialAbilities: "",
    weapons: "",
    description: "",
    createdBy: "System",
    isHostile: true,
    isDomesticated: false,
  },
  {
    name: "Succax",
    type: "Scavenger, bird-like creature with gills",
    size: "3kg, 1.5 meters long",
    form: "2 eyes, 2 wings, gills, fish-like tail",
    attributes: "",
    baseMovement: "",
    resistance: "",
    specialAbilities: "",
    weapons: "",
    description: "",
    createdBy: "System",
    isHostile: false,
    isDomesticated: false,
  },
];

const seed = async () => {
  try {
    for (const creature of creatures) {
      const ref = await addDoc(collection(db, "creatures"), {
        ...creature,
        createdAt: serverTimestamp(),
      });
      console.log(`✅ Seeded creature: ${creature.name} (${ref.id})`);
    }
    console.log("🧬 All creatures seeded!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding creatures:", error);
    process.exit(1);
  }
};

seed();
