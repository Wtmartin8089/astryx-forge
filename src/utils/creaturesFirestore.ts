import {
  collection,
  doc,
  addDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

const COL = "creatures";

export interface Creature {
  id?: string;
  name: string;
  type: string;
  size: string;
  form: string;
  attributes: string;
  baseMovement: string;
  resistance: string;
  specialAbilities: string;
  weapons: string;
  description: string;
  createdBy: string;
  createdAt?: any;
  isHostile?: boolean;
  isDomesticated?: boolean;
}

const SEED_CREATURES: Omit<Creature, "id">[] = [
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
    description:
      "Mostly domesticated, but some remain wild. In the wild, they travel and hunt in packs and can be highly aggressive. When domesticated, they are extremely loyal and will guard anything they are ordered to protect.",
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

/** Subscribe to all creatures ordered by name. Returns unsubscribe fn. */
export function subscribeToCreatures(
  callback: (creatures: Creature[]) => void,
): () => void {
  const q = query(collection(db, COL), orderBy("name"));
  return onSnapshot(q, (snap) => {
    const list: Creature[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Creature, "id">),
    }));
    callback(list);
  });
}

/** Get a single creature by Firestore document ID. */
export async function getCreature(id: string): Promise<Creature | null> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Creature, "id">) };
}

/** Create a new creature document. Returns the new document ID. */
export async function createCreature(
  data: Omit<Creature, "id" | "createdAt">,
): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Seed starter creatures if the collection is empty.
 * Safe to call on every mount — no-ops if data already exists.
 */
export async function seedCreaturesIfEmpty(): Promise<void> {
  const snap = await getDoc(doc(db, "__meta__", "creatures_seeded"));
  if (snap.exists()) return;

  for (const creature of SEED_CREATURES) {
    await addDoc(collection(db, COL), {
      ...creature,
      createdAt: serverTimestamp(),
    });
  }

  // Mark as seeded so we never run this twice
  await setDoc(doc(db, "__meta__", "creatures_seeded"), { at: serverTimestamp() });
}
