// Rewrites the marked <!--PROJECTS:START-->...<!--PROJECTS:END--> section (and
// the last-updated stamp) in README.md in place, from data.json. Everything
// else in README.md is left untouched.
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

// --- Projects table (ps --projects) ---
const statusFor = (repo) => (repo.archived ? "ARCHIVED" : "RUNNING");

let table = "| PID | PROJECT | TYPE | STATUS |\n";
table += "|-----|---------|------|--------|\n";
data.pinned.forEach((repo, i) => {
  const pid = String(1000 + i);
  const name = `[${repo.name}](${repo.url})`;
  table += `| ${pid} | ${name} | ${repo.language} | ${statusFor(repo)} |\n`;
});

readme = replaceBetween(readme, "<!--PROJECTS:START-->", "<!--PROJECTS:END-->", table.trim());

// --- Last updated stamp ---
const stamp = `_Last synced: ${data.generatedAt} • ${data.totalContributions} contributions • ${data.publicRepos} public repos_`;
readme = replaceBetween(readme, "<!--UPDATED:START-->", "<!--UPDATED:END-->", stamp);

writeFileSync(readmePath, readme);
console.log("README.md updated from data.json");
