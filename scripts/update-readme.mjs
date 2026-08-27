// Rewrites README.md to embed the single combined generated asset:
// profile.gif — one continuous animated GIF containing the boot wordmark
// scene, the contribution arcade shooter scene, and the static whoami / ps
// --projects / skills --progress content, all on one canvas with a single
// outer border (see scripts/render-combined.mjs). profile.gif is produced by
// render-combined.mjs, which this script runs after so the README always
// reflects the freshly generated asset.
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const readmePath = path.join(__dirname, "..", "README.md");

const README =
  '<img src="assets/generated/profile.gif" width="100%" alt="CodeCreatorManMike terminal profile: boot sequence, contribution arcade shooter, whoami, pinned projects, and skill progress" />';

writeFileSync(readmePath, README + "\n");
console.log("README.md updated (profile.gif)");
