// Rewrites README.md to embed the three generated assets back-to-back with
// no blank lines or plain-text lines between them: boot.gif, shooter.gif,
// then panel.svg (which itself bakes in the timestamp, whoami, ps
// --projects, skills bars, and the closing "SESSION ACTIVE" line as SVG
// text). panel.svg is produced by render-page.mjs, which this script runs
// first so the README always reflects the freshly generated asset.
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const readmePath = path.join(__dirname, "..", "README.md");

const README = [
  '<img src="assets/generated/boot.gif" width="100%" alt="boot sequence" />',
  '<img src="assets/generated/shooter.gif" width="100%" alt="contribution arcade shooter" />',
  '<img src="assets/generated/panel.svg" width="100%" alt="whoami, pinned projects, and skill progress" />',
].join("");

writeFileSync(readmePath, README + "\n");
console.log("README.md updated (boot.gif + shooter.gif + panel.svg)");
