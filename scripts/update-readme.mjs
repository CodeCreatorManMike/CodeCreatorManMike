// Rewrites the last-updated stamp (<!--UPDATED:START-->...<!--UPDATED:END-->)
// in README.md in place, from data.json. Pinned-project data is now rendered
// directly into assets/generated/identity.svg by render-identity.mjs, so no
// markdown table is generated here anymore. Everything else in README.md is
// left untouched.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const readmePath = path.join(__dirname, "..", "README.md");
const dataPath = path.join(__dirname, "..", "data.json");

const data = JSON.parse(readFileSync(dataPath, "utf8"));
let readme = readFileSync(readmePath, "utf8");

function replaceBetween(content, startMarker, endMarker, inner) {
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Markers ${startMarker}/${endMarker} not found in README.md`);
  }
  return (
    content.slice(0, start + startMarker.length) +
    "\n" +
    inner +
    "\n" +
    content.slice(end)
  );
}

// --- Last updated stamp ---
const stamp = `_Last synced: ${data.generatedAt} • ${data.totalContributions} contributions • ${data.publicRepos} public repos_`;
readme = replaceBetween(readme, "<!--UPDATED:START-->", "<!--UPDATED:END-->", stamp);

writeFileSync(readmePath, readme);
console.log("README.md updated from data.json");
