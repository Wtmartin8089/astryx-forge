import { useState, useEffect, useCallback } from "react";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../../firebase/firebaseConfig";
import { isAdmin } from "../../utils/adminAuth";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "npc" | "quest" | "lore" | "image";

interface NpcData {
  name: string;
  race: string;
  class_: string;
  appearance: string;
  personality: string;
  background: string;
  goals: string;
  secrets: string;
  id?: string;
  cached?: boolean;
}

interface QuestData {
  title: string;
  description: string;
  objectives: string[];
  rewards: string[];
  difficulty: string;
  factionInvolvement: string;
  id?: string;
  cached?: boolean;
}

interface LoreData {
  name: string;
  type: string;
  description: string;
  history: string;
  significance: string;
  connections: string[];
  id?: string;
  cached?: boolean;
}

interface ImageData {
  url: string | null;
  data: string | null;
  prompt: string;
  id?: string;
  cached?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EchoConsole() {
  const auth = getAuth();
  const user = auth.currentUser;
  const userIsAdmin = isAdmin(user?.uid ?? "");

  const [tab, setTab] = useState<Tab>("npc");

  if (!userIsAdmin) {
    return <p style={{ color: "#FF6A2B", textAlign: "center" }}>Access denied.</p>;
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.h1}>Echo Console</h1>
        <p style={s.subtitle}>AI content generation — NPCs, quests, lore, and imagery</p>
      </div>

      <div style={s.tabRow}>
        {(["npc", "quest", "lore", "image"] as Tab[]).map((t) => (
          <button
            key={t}
            style={tab === t ? s.tabActive : s.tab}
            onClick={() => setTab(t)}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div style={s.body}>
        {tab === "npc" && <NpcTab />}
        {tab === "quest" && <QuestTab />}
        {tab === "lore" && <LoreTab />}
        {tab === "image" && <ImageTab />}
      </div>
    </div>
  );
}

const TAB_LABELS: Record<Tab, string> = {
  npc: "NPC",
  quest: "Quest",
  lore: "Lore",
  image: "Image",
};

// ─── NPC Tab ──────────────────────────────────────────────────────────────────

function NpcTab() {
  const [faction, setFaction] = useState("");
  const [shipName, setShipName] = useState("");
  const [tone, setTone] = useState("dramatic");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [npc, setNpc] = useState<NpcData | null>(null);
  const [saved, setSaved] = useState(false);

  const generate = async (forceRegenerate = false) => {
    setLoading(true);
    setError(null);
    setSaved(false);
    if (!forceRegenerate) setNpc(null);
    try {
      const res = await fetch("/api/echo/generateNpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: { faction, shipName, tone },
          forceRegenerate,
        }),
      });
      let data: Record<string, unknown> = {};
      try { data = await res.json(); } catch {
        throw new Error(`Server error (HTTP ${res.status}) — check Vercel function logs.`);
      }
      if (!res.ok) throw new Error(String(data.error ?? `Request failed (HTTP ${res.status}).`));
      setNpc(data as unknown as NpcData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const saveToArchive = async () => {
    if (!npc) return;
    try {
      const auth = getAuth();
      await addDoc(collection(db, "echoNpcs"), {
        ...npc,
        savedBy: auth.currentUser?.uid ?? null,
        savedAt: serverTimestamp(),
      });
      setSaved(true);
    } catch {
      setError("Failed to save NPC to archive.");
    }
  };

  return (
    <div>
      <div style={s.form}>
        <Field label="Faction">
          <input style={s.input} value={faction} onChange={(e) => setFaction(e.target.value)} placeholder="e.g. Romulan Star Empire" />
        </Field>
        <Field label="Ship Name">
          <input style={s.input} value={shipName} onChange={(e) => setShipName(e.target.value)} placeholder="e.g. USS Astryx" />
        </Field>
        <Field label="Tone">
          <select style={s.input} value={tone} onChange={(e) => setTone(e.target.value)}>
            <option value="serious">Serious</option>
            <option value="dramatic">Dramatic</option>
            <option value="mysterious">Mysterious</option>
            <option value="humorous">Humorous</option>
          </select>
        </Field>
      </div>

      <div style={s.actionRow}>
        <button style={s.btnPrimary} onClick={() => generate(false)} disabled={loading}>
          {loading ? "Generating..." : "Generate NPC"}
        </button>
        {npc && (
          <button style={s.btnSecondary} onClick={() => generate(true)} disabled={loading}>
            ↻ Regenerate
          </button>
        )}
      </div>

      {loading && <LoadingBox label="Consulting Echo..." />}
      {error && !loading && <ErrorBox message={error} />}

      {npc && !loading && (
        <div style={s.resultCard}>
          {npc.cached && <span style={s.cachedTag}>cached</span>}
          <h2 style={s.resultTitle}>{npc.name}</h2>
          <ResultField label="Race" value={npc.race} accent="#F5B942" />
          <ResultField label="Class" value={npc.class_} accent="#F5B942" />
          <ResultField label="Appearance" value={npc.appearance} />
          <ResultField label="Personality" value={npc.personality} />
          <ResultField label="Background" value={npc.background} />
          <ResultField label="Goals" value={npc.goals} accent="#F5B942" />
          <ResultField label="Secrets" value={npc.secrets} accent="#FF6A2B" />

          <div style={s.actionRow}>
            <button style={s.btnPrimary} onClick={saveToArchive} disabled={saved}>
              {saved ? "✓ Saved" : "Save to Archive"}
            </button>
          </div>
        </div>
      )}

      <Library
        title="NPC Archive"
        collectionName="echoNpcs"
        render={(d: NpcData) => (
          <>
            <strong style={s.libName}>{d.name}</strong>
            <span style={s.libMeta}>{d.race} · {d.class_}</span>
          </>
        )}
      />
    </div>
  );
}

// ─── Quest Tab ────────────────────────────────────────────────────────────────

function QuestTab() {
  const [region, setRegion] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [factionHint, setFactionHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quest, setQuest] = useState<QuestData | null>(null);
  const [saved, setSaved] = useState(false);

  const generate = async (forceRegenerate = false) => {
    setLoading(true);
    setError(null);
    setSaved(false);
    if (!forceRegenerate) setQuest(null);
    try {
      const res = await fetch("/api/echo/generateQuest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: { region, difficulty, factionHint },
          forceRegenerate,
        }),
      });
      let data: Record<string, unknown> = {};
      try { data = await res.json(); } catch {
        throw new Error(`Server error (HTTP ${res.status}) — check Vercel function logs.`);
      }
      if (!res.ok) throw new Error(String(data.error ?? `Request failed (HTTP ${res.status}).`));
      setQuest(data as unknown as QuestData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const saveToArchive = async () => {
    if (!quest) return;
    try {
      const auth = getAuth();
      await addDoc(collection(db, "echoQuests"), {
        ...quest,
        savedBy: auth.currentUser?.uid ?? null,
        savedAt: serverTimestamp(),
      });
      setSaved(true);
    } catch {
      setError("Failed to save quest to archive.");
    }
  };

  return (
    <div>
      <div style={s.form}>
        <Field label="Region">
          <input style={s.input} value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. The Briar Patch" />
        </Field>
        <Field label="Difficulty">
          <select style={s.input} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="epic">Epic</option>
          </select>
        </Field>
        <Field label="Faction Hint">
          <input style={s.input} value={factionHint} onChange={(e) => setFactionHint(e.target.value)} placeholder="e.g. Ferengi Alliance" />
        </Field>
      </div>

      <div style={s.actionRow}>
        <button style={s.btnPrimary} onClick={() => generate(false)} disabled={loading}>
          {loading ? "Generating..." : "Generate Quest"}
        </button>
        {quest && (
          <button style={s.btnSecondary} onClick={() => generate(true)} disabled={loading}>
            ↻ Regenerate
          </button>
        )}
      </div>

      {loading && <LoadingBox label="Charting mission..." />}
      {error && !loading && <ErrorBox message={error} />}

      {quest && !loading && (
        <div style={s.resultCard}>
          {quest.cached && <span style={s.cachedTag}>cached</span>}
          <h2 style={s.resultTitle}>{quest.title}</h2>
          <ResultField label="Description" value={quest.description} />
          <ResultListField label="Objectives" items={quest.objectives} accent="#F5B942" />
          <ResultListField label="Rewards" items={quest.rewards} />
          <ResultField label="Difficulty" value={quest.difficulty} accent="#FF6A2B" />
          <ResultField label="Faction Involvement" value={quest.factionInvolvement} />

          <div style={s.actionRow}>
            <button style={s.btnPrimary} onClick={saveToArchive} disabled={saved}>
              {saved ? "✓ Saved" : "Save to Archive"}
            </button>
          </div>
        </div>
      )}

      <Library
        title="Quest Archive"
        collectionName="echoQuests"
        render={(d: QuestData) => (
          <>
            <strong style={s.libName}>{d.title}</strong>
            <span style={s.libMeta}>{d.difficulty}</span>
          </>
        )}
      />
    </div>
  );
}

// ─── Lore Tab ─────────────────────────────────────────────────────────────────

function LoreTab() {
  const [topic, setTopic] = useState("");
  const [type, setType] = useState("location");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lore, setLore] = useState<LoreData | null>(null);
  const [saved, setSaved] = useState(false);

  const generate = async (forceRegenerate = false) => {
    if (!topic.trim()) {
      setError("Topic is required.");
      return;
    }
    setLoading(true);
    setError(null);
    setSaved(false);
    if (!forceRegenerate) setLore(null);
    try {
      const res = await fetch("/api/echo/generateLore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, type, forceRegenerate }),
      });
      let data: Record<string, unknown> = {};
      try { data = await res.json(); } catch {
        throw new Error(`Server error (HTTP ${res.status}) — check Vercel function logs.`);
      }
      if (!res.ok) throw new Error(String(data.error ?? `Request failed (HTTP ${res.status}).`));
      setLore(data as unknown as LoreData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const saveToArchive = async () => {
    if (!lore) return;
    try {
      const auth = getAuth();
      await addDoc(collection(db, "echoLore"), {
        ...lore,
        savedBy: auth.currentUser?.uid ?? null,
        savedAt: serverTimestamp(),
      });
      setSaved(true);
    } catch {
      setError("Failed to save lore to archive.");
    }
  };

  return (
    <div>
      <div style={s.form}>
        <Field label="Topic">
          <input style={s.input} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. The Battle of Wolf 359" />
        </Field>
        <Field label="Type">
          <select style={s.input} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="location">Location</option>
            <option value="faction">Faction</option>
            <option value="event">Event</option>
            <option value="religion">Religion</option>
            <option value="kingdom">Kingdom</option>
          </select>
        </Field>
      </div>

      <div style={s.actionRow}>
        <button style={s.btnPrimary} onClick={() => generate(false)} disabled={loading}>
          {loading ? "Generating..." : "Generate Lore"}
        </button>
        {lore && (
          <button style={s.btnSecondary} onClick={() => generate(true)} disabled={loading}>
            ↻ Regenerate
          </button>
        )}
      </div>

      {loading && <LoadingBox label="Querying archives..." />}
      {error && !loading && <ErrorBox message={error} />}

      {lore && !loading && (
        <div style={s.resultCard}>
          {lore.cached && <span style={s.cachedTag}>cached</span>}
          <h2 style={s.resultTitle}>{lore.name}</h2>
          <ResultField label="Type" value={lore.type} accent="#F5B942" />
          <ResultField label="Description" value={lore.description} />
          <ResultField label="History" value={lore.history} />
          <ResultField label="Significance" value={lore.significance} accent="#FF6A2B" />
          <ResultListField label="Connections" items={lore.connections} />

          <div style={s.actionRow}>
            <button style={s.btnPrimary} onClick={saveToArchive} disabled={saved}>
              {saved ? "✓ Saved" : "Save to Archive"}
            </button>
          </div>
        </div>
      )}

      <Library
        title="Lore Archive"
        collectionName="echoLore"
        render={(d: LoreData) => (
          <>
            <strong style={s.libName}>{d.name}</strong>
            <span style={s.libMeta}>{d.type}</span>
          </>
        )}
      />
    </div>
  );
}

// ─── Image Tab ────────────────────────────────────────────────────────────────

function ImageTab() {
  const [imageType, setImageType] = useState("npc_portrait");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<ImageData | null>(null);

  const generate = async (forceRegenerate = false) => {
    if (!subject.trim()) {
      setError("Subject is required.");
      return;
    }
    setLoading(true);
    setError(null);
    if (!forceRegenerate) setImage(null);
    try {
      const res = await fetch("/api/echo/generateImage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageType, subject, forceRegenerate }),
      });
      let data: Record<string, unknown> = {};
      try { data = await res.json(); } catch {
        throw new Error(`Server error (HTTP ${res.status}) — check Vercel function logs.`);
      }
      if (!res.ok) throw new Error(String(data.error ?? `Request failed (HTTP ${res.status}).`));
      setImage(data as unknown as ImageData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const imageSrc = image
    ? image.url ?? (image.data ? `data:image/png;base64,${image.data}` : null)
    : null;

  return (
    <div>
      <div style={s.form}>
        <Field label="Image Type">
          <select style={s.input} value={imageType} onChange={(e) => setImageType(e.target.value)}>
            <option value="npc_portrait">NPC Portrait</option>
            <option value="location">Location</option>
            <option value="item">Item</option>
            <option value="faction_banner">Faction Banner</option>
            <option value="creature">Creature</option>
          </select>
        </Field>
        <Field label="Subject">
          <textarea
            style={{ ...s.input, minHeight: 80, resize: "vertical" }}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Describe what to render..."
          />
        </Field>
      </div>

      <div style={s.actionRow}>
        <button style={s.btnPrimary} onClick={() => generate(false)} disabled={loading}>
          {loading ? "Rendering..." : "Generate Image"}
        </button>
        {image && (
          <button style={s.btnSecondary} onClick={() => generate(true)} disabled={loading}>
            ↻ Regenerate
          </button>
        )}
      </div>

      {loading && <LoadingBox label="Rendering image..." />}
      {error && !loading && <ErrorBox message={error} />}

      {image && !loading && (
        <div style={s.resultCard}>
          {image.cached && <span style={s.cachedTag}>cached</span>}
          {imageSrc ? (
            <img src={imageSrc} alt={image.prompt} style={s.resultImage} />
          ) : (
            <p style={s.value}>No image returned.</p>
          )}
          <ResultField label="Prompt" value={image.prompt} />
          {imageSrc && (
            <div style={s.actionRow}>
              <a style={s.btnPrimaryLink} href={imageSrc} download="echo-image.png">
                Download
              </a>
            </div>
          )}
        </div>
      )}

      <Library
        title="Image Archive"
        collectionName="echoImages"
        render={(d: ImageData) => (
          <>
            <strong style={s.libName}>{d.prompt?.slice(0, 60) ?? "image"}</strong>
          </>
        )}
      />
    </div>
  );
}

// ─── Library (shared) ─────────────────────────────────────────────────────────

function Library<T>({
  title,
  collectionName,
  render,
}: {
  title: string;
  collectionName: string;
  render: (doc: T) => React.ReactNode;
}) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ref = collection(db, collectionName);
      // Order by generatedAt where available; fall back to unordered.
      let snap;
      try {
        snap = await getDocs(query(ref, orderBy("generatedAt", "desc"), limit(20)));
      } catch {
        snap = await getDocs(query(ref, limit(20)));
      }
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as T[]);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [collectionName]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={s.library}>
      <div style={s.libraryHeader}>
        <span style={s.libraryTitle}>{title}</span>
        <button style={s.refreshBtn} onClick={load} disabled={loading}>
          {loading ? "..." : "↻ Refresh"}
        </button>
      </div>
      {items.length === 0 && !loading && <p style={s.libEmpty}>No saved entries yet.</p>}
      <div style={s.libGrid}>
        {items.map((d, i) => (
          <div key={(d as { id?: string }).id ?? i} style={s.libCard}>
            {render(d)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Shared sub-components ─────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={s.field}>
      <label style={s.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

function ResultField({ label, value, accent = "#8AAAD0" }: { label: string; value: string; accent?: string }) {
  if (!value) return null;
  return (
    <div style={s.section}>
      <span style={{ ...s.sectionLabel, color: accent }}>{label}</span>
      <p style={s.value}>{value}</p>
    </div>
  );
}

function ResultListField({ label, items, accent = "#8AAAD0" }: { label: string; items: string[]; accent?: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={s.section}>
      <span style={{ ...s.sectionLabel, color: accent }}>{label}</span>
      <ul style={s.list}>
        {items.map((it, i) => (
          <li key={i} style={s.listItem}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

function LoadingBox({ label }: { label: string }) {
  return (
    <div style={s.loadingBox}>
      <Spinner />
      <span style={s.loadingText}>{label}</span>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div style={s.errorBox}>
      <p style={s.errorText}>{message}</p>
    </div>
  );
}

function Spinner() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 18,
        height: 18,
        border: "2px solid #F5B94230",
        borderTop: "2px solid #F5B942",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }}
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 760,
    margin: "0 auto",
    padding: "2rem 1rem 4rem",
    fontFamily: "Orbitron,sans-serif",
  },
  header: { marginBottom: "1.5rem" },
  h1: {
    fontFamily: "Orbitron,sans-serif",
    fontSize: "1.5rem",
    fontWeight: 900,
    background: "linear-gradient(135deg,#F5B942,#FF6A2B)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "3px",
    textTransform: "uppercase",
    margin: 0,
  },
  subtitle: {
    color: "#4A6A90",
    fontSize: "0.78rem",
    letterSpacing: "1px",
    marginTop: "0.4rem",
  },
  tabRow: {
    display: "flex",
    gap: "0.5rem",
    marginBottom: "1.5rem",
    flexWrap: "wrap",
  },
  tab: {
    background: "none",
    border: "1px solid #1E3A5F",
    color: "#8AAAD0",
    borderRadius: "6px",
    padding: "0.55rem 1.25rem",
    cursor: "pointer",
    fontFamily: "Orbitron,sans-serif",
    fontSize: "0.72rem",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
  },
  tabActive: {
    background: "linear-gradient(135deg,#F5B942,#FF6A2B)",
    border: "1px solid #F5B942",
    color: "#0B1E3A",
    borderRadius: "6px",
    padding: "0.55rem 1.25rem",
    cursor: "pointer",
    fontFamily: "Orbitron,sans-serif",
    fontWeight: 700,
    fontSize: "0.72rem",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
  },
  body: {},
  form: {
    backgroundColor: "#0D2240",
    border: "1px solid #1E3A5F",
    borderRadius: "8px",
    padding: "1.25rem",
    marginBottom: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  field: { display: "flex", flexDirection: "column", gap: "0.4rem" },
  fieldLabel: {
    fontFamily: "Orbitron,sans-serif",
    fontSize: "0.62rem",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    color: "#4A6A90",
  },
  input: {
    backgroundColor: "#07152B",
    border: "1px solid #1E3A5F",
    color: "#C8D8F0",
    borderRadius: "6px",
    padding: "0.6rem 0.8rem",
    fontFamily: "Orbitron,sans-serif",
    fontSize: "0.82rem",
    outline: "none",
  },
  actionRow: {
    display: "flex",
    gap: "0.75rem",
    flexWrap: "wrap",
    marginBottom: "1rem",
  },
  btnPrimary: {
    background: "linear-gradient(135deg,#F5B942,#FF6A2B)",
    border: "none",
    color: "#0B1E3A",
    borderRadius: "6px",
    padding: "0.65rem 1.5rem",
    cursor: "pointer",
    fontFamily: "Orbitron,sans-serif",
    fontWeight: 700,
    fontSize: "0.75rem",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
  },
  btnPrimaryLink: {
    background: "linear-gradient(135deg,#F5B942,#FF6A2B)",
    color: "#0B1E3A",
    borderRadius: "6px",
    padding: "0.65rem 1.5rem",
    cursor: "pointer",
    fontFamily: "Orbitron,sans-serif",
    fontWeight: 700,
    fontSize: "0.75rem",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    textDecoration: "none",
  },
  btnSecondary: {
    background: "none",
    border: "1px solid #1E3A5F",
    color: "#8AAAD0",
    borderRadius: "6px",
    padding: "0.65rem 1.25rem",
    cursor: "pointer",
    fontFamily: "Orbitron,sans-serif",
    fontSize: "0.75rem",
    letterSpacing: "1px",
  },
  resultCard: {
    position: "relative",
    backgroundColor: "#07152B",
    border: "1px solid #1E3A5F",
    borderRadius: "8px",
    padding: "1.5rem",
    marginBottom: "1.5rem",
  },
  cachedTag: {
    position: "absolute",
    top: "0.75rem",
    right: "0.75rem",
    fontSize: "0.6rem",
    letterSpacing: "1px",
    textTransform: "uppercase",
    color: "#4A6A90",
    border: "1px solid #1E3A5F",
    borderRadius: "4px",
    padding: "0.15rem 0.5rem",
  },
  resultTitle: {
    fontFamily: "Orbitron,sans-serif",
    fontSize: "1.1rem",
    fontWeight: 900,
    background: "linear-gradient(135deg,#F5B942,#FF6A2B)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "2px",
    marginBottom: "1.25rem",
  },
  resultImage: {
    width: "100%",
    borderRadius: "8px",
    border: "1px solid #1E3A5F",
    marginBottom: "1rem",
  },
  section: {
    marginBottom: "1rem",
    paddingBottom: "1rem",
    borderBottom: "1px solid #1E3A5F",
  },
  sectionLabel: {
    display: "block",
    fontFamily: "Orbitron,sans-serif",
    fontSize: "0.62rem",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    marginBottom: "0.3rem",
  },
  value: {
    color: "#C8D8F0",
    fontSize: "0.9rem",
    lineHeight: 1.65,
    margin: 0,
  },
  list: { margin: 0, paddingLeft: "1.1rem" },
  listItem: {
    color: "#C8D8F0",
    fontSize: "0.88rem",
    lineHeight: 1.6,
    marginBottom: "0.25rem",
  },
  loadingBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1rem",
    padding: "2.5rem 0",
  },
  loadingText: {
    fontFamily: "Orbitron,sans-serif",
    fontSize: "0.8rem",
    letterSpacing: "2px",
    color: "#F5B942",
    textTransform: "uppercase",
  },
  errorBox: {
    backgroundColor: "#2A0F0F",
    border: "1px solid #FF6A2B40",
    borderRadius: "8px",
    padding: "1rem",
    marginBottom: "1.5rem",
  },
  errorText: { color: "#FF6A2B", fontSize: "0.85rem", margin: 0 },
  library: {
    marginTop: "2rem",
    borderTop: "1px solid #1E3A5F",
    paddingTop: "1.25rem",
  },
  libraryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
  },
  libraryTitle: {
    fontFamily: "Orbitron,sans-serif",
    fontSize: "0.7rem",
    letterSpacing: "2px",
    textTransform: "uppercase",
    color: "#4A6A90",
  },
  refreshBtn: {
    background: "none",
    border: "1px solid #1E3A5F",
    color: "#8AAAD0",
    borderRadius: "6px",
    padding: "0.35rem 0.9rem",
    cursor: "pointer",
    fontFamily: "Orbitron,sans-serif",
    fontSize: "0.68rem",
    letterSpacing: "1px",
  },
  libEmpty: { color: "#3A5A80", fontSize: "0.8rem" },
  libGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: "0.75rem",
  },
  libCard: {
    backgroundColor: "#0D2240",
    border: "1px solid #1E3A5F",
    borderRadius: "6px",
    padding: "0.75rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  libName: { color: "#C8D8F0", fontSize: "0.8rem" },
  libMeta: { color: "#4A6A90", fontSize: "0.68rem", letterSpacing: "1px" },
};
