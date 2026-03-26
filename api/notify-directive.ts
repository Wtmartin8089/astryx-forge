import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface NotifyDirectiveBody {
  emails: string[];
  subject: string;
  html: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { emails, subject, html } = req.body as NotifyDirectiveBody;

  if (!Array.isArray(emails) || emails.length === 0 || !subject || !html) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  let sent = 0;
  const failures: string[] = [];

  for (const email of emails) {
    try {
      await resend.emails.send({
        from: "Fleet Command <command@astryxforge.com>",
        to: email,
        subject,
        html,
      });
      sent++;
    } catch (err) {
      console.error(`[notify-directive] Failed to send to ${email}:`, err);
      failures.push(email);
    }
  }

  console.log(`[notify-directive] Sent: ${sent}, Failed: ${failures.length}`);
  return res.status(200).json({ success: true, sent, failed: failures.length });
}
