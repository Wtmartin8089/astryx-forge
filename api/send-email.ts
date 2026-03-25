import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { to, subject, html } = req.body as { to?: string; subject?: string; html?: string };

  if (!to || !subject || !html) {
    return res.status(400).json({ success: false, error: "Missing required fields: to, subject, html" });
  }

  try {
    await resend.emails.send({
      from: "Fleet Command <command@astryxforge.com>",
      to,
      subject,
      html,
    });
    return res.status(200).json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[send-email] Failed to send:", err);
    return res.status(500).json({ success: false, error: message });
  }
}
