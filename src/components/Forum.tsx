import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, onSnapshot, query } from "firebase/firestore";
import { storage, db } from "../firebase/firebaseConfig";
import { getAuth } from "firebase/auth";
import { FORUM_CATEGORIES, type ForumCategoryId } from "../data/forumCategories";
import { getShips, type Ship } from "../data/shipsData";
import {
  subscribeToThreads,
  subscribeToReplies,
  subscribeToThreadCounts,
  createThread,
  addReply,
  type ForumThread,
  type ForumReply,
} from "../utils/forumFirestore";

/* ── Starbase board constant ── */
const STARBASE_BOARD = {
  id: "starbase",
  name: "Starbase Machida",
  registry: "SB-001",
};

/* ── Timestamp formatting ── */
function formatTime(ts: { toDate?: () => Date } | null): string {
  if (!ts?.toDate) return "Just now";
  const d = ts.toDate();
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString();
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
const Forum: React.FC = () => {
  const auth = getAuth();
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    return auth.onAuthStateChanged((u) => setUser(u));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Resolve user's crew character name ── */
  const [allCrew, setAllCrew] = useState<Record<string, { name: string; ownerId?: string | null }>>({});
  useEffect(() => {
    const q = query(collection(db, "crew"));
    return onSnapshot(q, (snap) => {
      const result: Record<string, { name: string; ownerId?: string | null }> = {};
      snap.docs.forEach((d) => { result[d.id] = d.data() as any; });
      setAllCrew(result);
    });
  }, []);

  const userCharacterName = user
    ? Object.values(allCrew).find((m) => m.ownerId === user.uid)?.name ?? null
    : null;

  const userWithName = user
    ? { uid: user.uid, email: user.email, displayName: userCharacterName }
    : null;

  /* ── Navigation state ── */
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ForumCategoryId | null>(null);
  const [selectedThread, setSelectedThread] = useState<ForumThread | null>(null);

  /* ── Data ── */
  const [ships, setShips] = useState<Record<string, Ship>>(getShips);
  const [threadCounts, setThreadCounts] = useState<Record<string, number>>({});
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [replies, setReplies] = useState<ForumReply[]>([]);

  /* ── Form state ── */
  const [showNewThread, setShowNewThread] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  /* ── Refresh ships when returning to board selection ── */
  useEffect(() => {
    if (!selectedBoard) setShips(getShips());
  }, [selectedBoard]);

  /* ── Subscribe to thread counts for selected board ── */
  useEffect(() => {
    if (!selectedBoard) return;
    return subscribeToThreadCounts(selectedBoard, setThreadCounts);
  }, [selectedBoard]);

  /* ── Subscribe to threads for selected board+category ── */
  useEffect(() => {
    if (!selectedBoard || !selectedCategory) return;
    return subscribeToThreads(selectedBoard, selectedCategory, setThreads);
  }, [selectedBoard, selectedCategory]);

  /* ── Subscribe to replies for selected thread ── */
  useEffect(() => {
    if (!selectedThread) return;
    return subscribeToReplies(selectedThread.id, setReplies);
  }, [selectedThread]);


  /* ── Navigation helpers ── */
  const goBack = useCallback(() => {
    if (selectedThread) {
      setSelectedThread(null);
      setReplies([]);
    } else if (selectedCategory) {
      setSelectedCategory(null);
      setThreads([]);
      setShowNewThread(false);
    } else if (selectedBoard) {
      setSelectedBoard(null);
      setThreadCounts({});
    }
  }, [selectedThread, selectedCategory, selectedBoard]);

  const boardName = selectedBoard === "starbase"
    ? STARBASE_BOARD.name
    : ships[selectedBoard || ""]?.name || selectedBoard || "";

  /* ── Create thread ── */
  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim() || !userWithName || !selectedBoard || !selectedCategory) return;
    setLoading(true);
    try {
      await createThread(selectedBoard, selectedCategory, newTitle.trim(), newContent.trim(), userWithName);
      setNewTitle("");
      setNewContent("");
      setShowNewThread(false);
    } catch (err) {
      console.error("Error creating thread:", err);
    }
    setLoading(false);
  };

  /* ── Add reply (with Computer Core interception) ── */
  const handleAddReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !userWithName || !selectedThread) return;
    setLoading(true);
    try {
      let attachmentUrl = "";
      if (replyFile) {
        const fileRef = ref(storage, `forum-attachments/${Date.now()}_${replyFile.name}`);
        await uploadBytes(fileRef, replyFile);
        attachmentUrl = await getDownloadURL(fileRef);
      }

      // Post the player's message first
      await addReply(selectedThread.id, replyText.trim(), attachmentUrl, userWithName);

      // Check for Computer Core command
      if (replyText.trim().toLowerCase().startsWith("computer,")) {
        try {
          const res = await fetch("/api/computerCommand", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: replyText.trim(),
              playerId: userWithName!.uid,
              boardId: selectedBoard ?? "",
            }),
          });
          if (res.ok) {
            const data = await res.json();
            // Post computer response as a special STARFLEET COMPUTER reply
            await addReply(
              selectedThread.id,
              data.response,
              "",
              { uid: "COMPUTER_CORE", email: "STARFLEET COMPUTER" },
            );
          }
        } catch (computerErr) {
          console.warn("[ComputerCore] Command failed:", computerErr);
        }
      }

      setReplyText("");
      setReplyFile(null);
    } catch (err) {
      console.error("Error adding reply:", err);
    }
    setLoading(false);
  };

  /* ── Build all boards: starbase + ships ── */
  const allBoards = [
    STARBASE_BOARD,
    ...Object.values(ships).map((s) => ({ id: s.id, name: s.name, registry: s.registry })),
  ];

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div style={{
      minHeight: "100vh",
      background: "#000",
      padding: "1.5rem",
      color: "#ff9900",
      fontFamily: "'Orbitron', sans-serif",
    }}>
      {/* ── Header bar ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        marginBottom: "1.5rem",
      }}>
        {selectedBoard && (
          <button onClick={goBack} style={styles.backBtn}>&larr; Back</button>
        )}
        <h1 style={{ margin: 0, fontSize: "1.5rem", letterSpacing: "0.15em" }}>
          {!selectedBoard
            ? "SUBSPACE FORUM"
            : !selectedCategory
              ? boardName.toUpperCase()
              : !selectedThread
                ? `${boardName} / ${FORUM_CATEGORIES.find((c) => c.id === selectedCategory)?.label}`
                : selectedThread.title}
        </h1>
      </div>

      {/* ── Decorative LCARS bar ── */}
      <div style={{
        display: "flex",
        gap: "4px",
        marginBottom: "1.5rem",
      }}>
        <div style={{ ...styles.lcarsBar, background: "#ff9900", flex: 3 }} />
        <div style={{ ...styles.lcarsBar, background: "#6699cc", flex: 1 }} />
        <div style={{ ...styles.lcarsBar, background: "#9933cc", flex: 1 }} />
        <div style={{ ...styles.lcarsBar, background: "#ffcc33", flex: 2 }} />
      </div>

      {/* ── Board Selection ── */}
      {!selectedBoard && (
        <div style={styles.grid}>
          {allBoards.map((board) => (
            <div
              key={board.id}
              onClick={() => setSelectedBoard(board.id)}
              style={styles.boardCard}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "#ff9900";
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "#6699cc";
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
              }}
            >
              <div style={{
                height: "4px",
                background: board.id === "starbase" ? "#9933cc" : "#ff9900",
                borderRadius: "2px",
                marginBottom: "0.75rem",
              }} />
              <h3 style={{ margin: "0 0 0.25rem", fontSize: "1.1rem", color: "#ff9900" }}>
                {board.name}
              </h3>
              {board.registry && (
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#6699cc" }}>
                  {board.registry}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Category Selection ── */}
      {selectedBoard && !selectedCategory && (
        <div style={styles.grid}>
          {FORUM_CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                ...styles.categoryCard,
                borderLeft: `4px solid ${cat.color}`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = "#1a1a2e";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = "#111";
              }}
            >
              <h3 style={{ margin: "0 0 0.25rem", color: cat.color, fontSize: "1rem" }}>
                {cat.label}
              </h3>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#888" }}>
                {threadCounts[cat.id] || 0} thread{(threadCounts[cat.id] || 0) !== 1 ? "s" : ""}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Thread List ── */}
      {selectedBoard && selectedCategory && !selectedThread && (
        <div>
          <button
            onClick={() => setShowNewThread((v) => !v)}
            style={{ ...styles.actionBtn, marginBottom: "1rem" }}
          >
            {showNewThread ? "CANCEL" : "NEW THREAD"}
          </button>

          {showNewThread && (
            <form onSubmit={handleCreateThread} style={styles.formCard}>
              <input
                type="text"
                placeholder="Thread title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                style={styles.input}
              />
              <textarea
                placeholder="Write your first post..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                style={{ ...styles.input, minHeight: "100px", resize: "vertical" }}
              />
              <button type="submit" disabled={loading} style={styles.actionBtn}>
                {loading ? "TRANSMITTING..." : "CREATE THREAD"}
              </button>
            </form>
          )}

          {threads.length === 0 && !showNewThread && (
            <p style={{ color: "#666", textAlign: "center", marginTop: "3rem" }}>
              No threads yet. Be the first to start a discussion.
            </p>
          )}

          {threads.map((thread) => {
            const isDirective = thread.type === "command";
            return (
              <div
                key={thread.id}
                onClick={() => setSelectedThread(thread)}
                style={{
                  ...styles.threadRow,
                  ...(isDirective ? {
                    borderLeft: "3px solid #9933cc",
                    background: "#0d0a14",
                  } : {}),
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = isDirective ? "#9933cc" : "#ff9900";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "#333";
                }}
              >
                <div style={{ flex: 1 }}>
                  {isDirective && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.2rem" }}>
                      <span style={{
                        color: "#9933cc",
                        fontSize: "0.6rem",
                        letterSpacing: "2px",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                        border: "1px solid #9933cc60",
                        borderRadius: "3px",
                        padding: "0.1rem 0.4rem",
                      }}>
                        ⚡ BRIDGE DIRECTIVE
                      </span>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {thread.pinned && (
                      <span style={{ color: "#ffcc33", fontSize: "0.7rem" }}>PINNED</span>
                    )}
                    <span style={{ color: isDirective ? "#cc99ff" : "#ff9900", fontSize: "0.95rem" }}>
                      {thread.title}
                    </span>
                  </div>
                  <span style={{ color: "#666", fontSize: "0.75rem" }}>
                    by {thread.author}{thread.rank ? ` · ${thread.rank}` : ""} &middot; {formatTime(thread.createdAt)}
                  </span>
                </div>
                <div style={{ textAlign: "right", minWidth: "80px" }}>
                  <div style={{ color: "#6699cc", fontSize: "0.85rem" }}>
                    {thread.replyCount} {thread.replyCount === 1 ? "reply" : "replies"}
                  </div>
                  <div style={{ color: "#555", fontSize: "0.7rem" }}>
                    {formatTime(thread.lastReplyAt)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Thread View (replies) ── */}
      {selectedThread && (
        <div>
          {/* Directive banner */}
          {selectedThread.type === "command" && (
            <div style={{
              backgroundColor: "#1a0d26",
              border: "1px solid #9933cc60",
              borderLeft: "3px solid #9933cc",
              borderRadius: "4px",
              padding: "0.75rem 1rem",
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}>
              <span style={{ color: "#9933cc", fontSize: "1rem" }}>⚡</span>
              <div>
                <p style={{ margin: 0, color: "#9933cc", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", fontWeight: "bold" }}>
                  Bridge Directive
                </p>
                <p style={{ margin: "0.15rem 0 0", color: "#cc99ff", fontSize: "0.8rem" }}>
                  Issued by {selectedThread.author}{selectedThread.rank ? ` · ${selectedThread.rank}` : ""}
                </p>
              </div>
            </div>
          )}
          {replies.map((reply) => {
            const isComputerReply = reply.author === "STARFLEET COMPUTER";
            return isComputerReply ? (
              <div key={reply.id} style={computerReplyStyle}>
                <div style={computerHeaderStyle}>
                  <span style={{ color: "#F5B942", fontFamily: "Orbitron, sans-serif", fontSize: "0.7rem", letterSpacing: "2px" }}>
                    ◈ STARFLEET COMPUTER
                  </span>
                  <span style={{ color: "#3A5A80", fontSize: "0.75rem" }}>{formatTime(reply.createdAt)}</span>
                </div>
                <pre style={computerTextStyle}>{reply.content.replace("## STARFLEET COMPUTER\n\n", "")}</pre>
              </div>
            ) : (
              <div key={reply.id} style={styles.replyCard}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.5rem",
                  fontSize: "0.8rem",
                }}>
                  <span style={{ color: "#6699cc" }}>{reply.author}</span>
                  <span style={{ color: "#555" }}>{formatTime(reply.createdAt)}</span>
                </div>
                <p style={{ margin: 0, color: "#ccc", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {reply.content}
                </p>
                {reply.attachmentUrl && (
                  <a
                    href={reply.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#33cc99", fontSize: "0.8rem", marginTop: "0.5rem", display: "inline-block" }}
                  >
                    View Attachment
                  </a>
                )}
              </div>
            );
          })}

          {/* Reply form */}
          <form onSubmit={handleAddReply} style={{ ...styles.formCard, marginTop: "1rem" }}>
            <textarea
              placeholder="Write a reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              style={{ ...styles.input, minHeight: "80px", resize: "vertical" }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <label style={{ color: "#666", fontSize: "0.8rem", cursor: "pointer" }}>
                <input
                  type="file"
                  onChange={(e) => setReplyFile(e.target.files?.[0] || null)}
                  style={{ display: "none" }}
                />
                {replyFile ? replyFile.name : "Attach file..."}
              </label>
              <button type="submit" disabled={loading} style={styles.actionBtn}>
                {loading ? "TRANSMITTING..." : "POST REPLY"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

/* ================================================================
   STYLES
   ================================================================ */
/* ── Computer Core reply styles ── */
const computerReplyStyle: React.CSSProperties = {
  backgroundColor: "#07152B",
  border: "1px solid #F5B94240",
  borderLeft: "3px solid #F5B942",
  borderRadius: "4px",
  padding: "0.85rem 1rem",
  marginBottom: "0.75rem",
  boxShadow: "0 0 12px #F5B94210",
};

const computerHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "0.65rem",
  paddingBottom: "0.5rem",
  borderBottom: "1px solid #1E3A5F",
};

const computerTextStyle: React.CSSProperties = {
  margin: 0,
  color: "#C8D8F0",
  fontFamily: "monospace",
  fontSize: "0.85rem",
  lineHeight: 1.7,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const styles: Record<string, React.CSSProperties> = {
  lcarsBar: {
    height: "6px",
    borderRadius: "3px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "1rem",
  },
  boardCard: {
    background: "#111",
    border: "2px solid #6699cc",
    borderRadius: "0 20px 0 0",
    padding: "1.25rem",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  categoryCard: {
    background: "#111",
    borderRadius: "4px",
    padding: "1.25rem",
    cursor: "pointer",
    transition: "background 0.2s ease",
  },
  threadRow: {
    display: "flex",
    alignItems: "center",
    padding: "0.75rem 1rem",
    borderBottom: "1px solid #333",
    cursor: "pointer",
    transition: "border-color 0.2s ease",
  },
  replyCard: {
    background: "#0d0d1a",
    border: "1px solid #222",
    borderRadius: "4px",
    padding: "1rem",
    marginBottom: "0.5rem",
  },
  formCard: {
    background: "#0d0d1a",
    border: "1px solid #333",
    borderRadius: "4px",
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  input: {
    background: "#1a1a2e",
    border: "1px solid #6699cc",
    borderRadius: "4px",
    padding: "0.6rem 0.75rem",
    color: "#fff",
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "0.85rem",
    width: "100%",
    boxSizing: "border-box",
  },
  actionBtn: {
    background: "#6699cc",
    color: "#000",
    border: "none",
    borderRadius: "4px",
    padding: "0.5rem 1.25rem",
    fontFamily: "'Orbitron', sans-serif",
    fontWeight: "bold",
    fontSize: "0.8rem",
    cursor: "pointer",
    letterSpacing: "0.1em",
    alignSelf: "flex-start",
  },
  backBtn: {
    background: "transparent",
    color: "#6699cc",
    border: "1px solid #6699cc",
    borderRadius: "4px",
    padding: "0.35rem 0.75rem",
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "0.75rem",
    cursor: "pointer",
  },
};

export default Forum;
