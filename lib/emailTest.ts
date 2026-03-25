/**
 * Test function — call this to verify Resend integration is working.
 * Usage: POST /api/send-email with the body below, or call sendTestEmail() directly.
 *
 * Example curl:
 *   curl -X POST http://localhost:3000/api/send-email \
 *     -H "Content-Type: application/json" \
 *     -d '{"to":"you@example.com","subject":"Test Transmission","html":"<p>Test transmission from Fleet Command</p>"}'
 */

export async function sendTestEmail(to: string): Promise<void> {
  const res = await fetch("/api/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to,
      subject: "Test Transmission — Astryx Forge",
      html: "<p>Test transmission from <strong>Fleet Command</strong>. All systems nominal.</p>",
    }),
  });
  const data = await res.json();
  console.log("[emailTest]", data);
}
