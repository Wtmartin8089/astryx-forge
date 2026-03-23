/**
 * ActiveCharacterContext.tsx
 * Provides the "active character" identity for multi-character users.
 * Persists selection to localStorage; auto-selects first character on first load.
 */
import { createContext, useContext, useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export type ActiveCharEntry = {
  id: string;
  name: string;
  rank?: string;
  role?: string;
  shipId?: string;
  portrait?: string;
};

type ActiveCharContextValue = {
  userCharacters: ActiveCharEntry[];
  activeCharId: string | null;
  activeChar: ActiveCharEntry | null;
  setActiveCharId: (id: string) => void;
};

const ActiveCharContext = createContext<ActiveCharContextValue>({
  userCharacters: [],
  activeCharId: null,
  activeChar: null,
  setActiveCharId: () => {},
});

const LS_KEY = "activeCharacterId";

export function ActiveCharacterProvider({ children }: { children: React.ReactNode }) {
  const [userCharacters, setUserCharacters] = useState<ActiveCharEntry[]>([]);
  const [activeCharId, setActiveCharIdState] = useState<string | null>(
    () => localStorage.getItem(LS_KEY),
  );

  useEffect(() => {
    const auth = getAuth();
    let crewUnsub: (() => void) | null = null;

    const authUnsub = onAuthStateChanged(auth, (user) => {
      if (crewUnsub) { crewUnsub(); crewUnsub = null; }
      if (!user) {
        setUserCharacters([]);
        return;
      }

      const q = query(
        collection(db, "crew"),
        where("ownerId", "==", user.uid),
        where("status", "==", "active"),
      );

      crewUnsub = onSnapshot(q, (snap) => {
        const chars: ActiveCharEntry[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            name: data.name,
            rank: data.rank,
            role: data.role,
            shipId: data.shipId,
            portrait: data.portrait,
          };
        });

        setUserCharacters(chars);

        // Keep stored selection if still valid; otherwise fall back to first
        setActiveCharIdState((prev) => {
          if (prev && chars.find((c) => c.id === prev)) return prev;
          const first = chars[0]?.id ?? null;
          if (first) localStorage.setItem(LS_KEY, first);
          return first;
        });
      });
    });

    return () => {
      authUnsub();
      if (crewUnsub) crewUnsub();
    };
  }, []);

  const setActiveCharId = (id: string) => {
    localStorage.setItem(LS_KEY, id);
    setActiveCharIdState(id);
  };

  const activeChar = userCharacters.find((c) => c.id === activeCharId) ?? null;

  return (
    <ActiveCharContext.Provider value={{ userCharacters, activeCharId, activeChar, setActiveCharId }}>
      {children}
    </ActiveCharContext.Provider>
  );
}

export function useActiveCharacter() {
  return useContext(ActiveCharContext);
}
