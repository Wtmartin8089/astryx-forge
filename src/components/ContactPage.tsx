import { useRef, useState } from "react";
import emailjs from "@emailjs/browser";
import Header from "./Header";

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID ?? "";
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID ?? "";
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY ?? "";

type Status = "idle" | "sending" | "sent" | "error";

export default function ContactPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<Status>("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRef.current) return;
    setStatus("sending");
    try {
      await emailjs.sendForm(SERVICE_ID, TEMPLATE_ID, formRef.current, { publicKey: PUBLIC_KEY });
      setStatus("sent");
      formRef.current.reset();
    } catch {
      setStatus("error");
    }
  };

  return (
    <div style={styles.page}>
      <Header />

      <section style={styles.hero}>
        <p style={styles.label}>▸ CONTACT</p>
        <h1 style={styles.title}>Get in Touch</h1>
        <p style={styles.subtitle}>
          Questions, ideas, or just want to join the crew? Send a message below or reach out directly.
        </p>
        <a href="mailto:wtmartin2980@gmail.com" style={styles.emailLink}>
          wtmartin2980@gmail.com
        </a>
      </section>

      <section style={styles.formSection}>
        {status === "sent" ? (
          <div style={styles.successBox}>
            <p style={styles.successTitle}>Message received.</p>
            <p style={styles.successSub}>We'll be in touch shortly, Commander.</p>
          </div>
        ) : (
          <form ref={formRef} onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.fieldLabel}>Name</label>
                <input name="from_name" required style={styles.input} placeholder="Your name" />
              </div>
              <div style={styles.field}>
                <label style={styles.fieldLabel}>Email</label>
                <input name="reply_to" type="email" required style={styles.input} placeholder="your@email.com" />
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.fieldLabel}>Subject</label>
              <input name="subject" required style={styles.input} placeholder="What's this about?" />
            </div>

            <div style={styles.field}>
              <label style={styles.fieldLabel}>Message</label>
              <textarea name="message" required rows={6} style={styles.textarea} placeholder="Your message..." />
            </div>

            {status === "error" && (
              <p style={styles.errorMsg}>Something went wrong. Please try emailing directly.</p>
            )}

            <button type="submit" disabled={status === "sending"} style={styles.submitBtn}>
              {status === "sending" ? "Transmitting…" : "Send Message"}
            </button>
          </form>
        )}
      </section>

      <footer style={styles.footer}>
        <span style={styles.footerText}>© 2026 Astryx Forge · All rights reserved</span>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    backgroundColor: "#07152B",
    minHeight: "100vh",
    color: "#ffffff",
    fontFamily: "'Segoe UI', sans-serif",
  },
  hero: {
    textAlign: "center",
    padding: "4rem 2rem 3rem",
    borderBottom: "1px solid #0D2240",
  },
  label: {
    fontFamily: "Orbitron, sans-serif",
    fontSize: "0.62rem",
    letterSpacing: "3px",
    color: "#3A5A80",
    textTransform: "uppercase",
    margin: "0 0 1rem 0",
  },
  title: {
    fontFamily: "Orbitron, sans-serif",
    fontSize: "clamp(1.6rem, 4vw, 2.6rem)",
    fontWeight: 700,
    color: "#F5B942",
    margin: "0 0 1rem 0",
  },
  subtitle: {
    color: "#8AAAD0",
    fontSize: "1rem",
    maxWidth: "520px",
    margin: "0 auto 1.25rem",
    lineHeight: 1.6,
  },
  emailLink: {
    fontFamily: "Orbitron, sans-serif",
    fontSize: "0.78rem",
    letterSpacing: "1.5px",
    color: "#F5B942",
    textDecoration: "none",
    borderBottom: "1px solid #F5B94250",
    paddingBottom: "2px",
  },
  formSection: {
    maxWidth: "700px",
    margin: "3rem auto",
    padding: "0 2rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1.25rem",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  fieldLabel: {
    fontFamily: "Orbitron, sans-serif",
    fontSize: "0.62rem",
    letterSpacing: "2px",
    color: "#3A5A80",
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#0A1E38",
    border: "1px solid #1A3456",
    borderRadius: "4px",
    color: "#C8D8F0",
    fontFamily: "'Segoe UI', sans-serif",
    fontSize: "0.92rem",
    padding: "0.65rem 0.9rem",
    outline: "none",
  },
  textarea: {
    backgroundColor: "#0A1E38",
    border: "1px solid #1A3456",
    borderRadius: "4px",
    color: "#C8D8F0",
    fontFamily: "'Segoe UI', sans-serif",
    fontSize: "0.92rem",
    padding: "0.65rem 0.9rem",
    resize: "vertical",
    outline: "none",
  },
  submitBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#F5B942",
    color: "#07152B",
    border: "none",
    fontFamily: "Orbitron, sans-serif",
    fontSize: "0.78rem",
    fontWeight: 700,
    letterSpacing: "2px",
    textTransform: "uppercase",
    padding: "0.85rem 2.25rem",
    borderRadius: "4px",
    cursor: "pointer",
  },
  errorMsg: {
    color: "#FF6A6A",
    fontFamily: "Orbitron, sans-serif",
    fontSize: "0.72rem",
    letterSpacing: "1px",
  },
  successBox: {
    textAlign: "center",
    padding: "3rem 2rem",
    border: "1px solid #1A3456",
    borderRadius: "8px",
    backgroundColor: "#0A1E38",
  },
  successTitle: {
    fontFamily: "Orbitron, sans-serif",
    fontSize: "1.2rem",
    color: "#F5B942",
    margin: "0 0 0.5rem 0",
  },
  successSub: {
    color: "#8AAAD0",
    fontSize: "0.9rem",
    margin: 0,
  },
  footer: {
    textAlign: "center",
    padding: "1.5rem",
    borderTop: "1px solid #0D2240",
    marginTop: "4rem",
  },
  footerText: {
    color: "#1A3456",
    fontSize: "0.72rem",
    fontFamily: "Orbitron, sans-serif",
    letterSpacing: "2px",
    textTransform: "uppercase",
  },
};
