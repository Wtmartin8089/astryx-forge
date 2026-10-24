import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const assets = await readdir("dist/assets");
const bundles = await Promise.all(
  assets.filter((name) => name.endsWith(".js")).map((name) => readFile(join("dist/assets", name), "utf8")),
);
const bundle = bundles.join("\n");
for (const marker of ["astryxforge-integration", "integration-fake-key", "127.0.0.1"]) {
  if (!bundle.includes(marker)) throw new Error(`Integration Firebase marker missing: ${marker}`);
}
for (const marker of ["startrekrpg-40ef7", "startrekrpg-40ef7.firebasestorage.app"]) {
  if (bundle.includes(marker)) throw new Error("Production Firebase configuration entered the integration bundle.");
}
