import assert from "node:assert/strict";
import test from "node:test";
import { createIntegrationServer } from "../runtime/server.js";

test("the integration runtime wires health and the real admin proxy handler", async (context) => {
  const server = createIntegrationServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;

  const health = await fetch(`${origin}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: "ok" });

  const session = await fetch(`${origin}/api/admin/session`);
  assert.equal(session.status, 200);
  assert.equal(session.headers.get("cache-control"), "no-store");
  assert.match(session.headers.get("set-cookie") || "", /^astryx_admin_csrf=/);
  const body = await session.json();
  assert.equal(body.data.authenticated, false);
  assert.match(body.data.csrf_token, /^[a-f0-9]{48}$/);
});
