// Renders assets/generated/panel.svg: ONE combined dark panel stitching
// together, top to bottom:
//   1. the "Last synced" timestamp line (as SVG text, not markdown)
//   2. the whoami + ps --projects section (render-identity.mjs)
//   3. the skills --progress bars section (render-skills.mjs)
//   4. the closing "SESSION ACTIVE" line (as SVG text, not markdown)
// all on one continuous background, so the README embeds a single seamless
// image instead of several stacked images with markdown text between them.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PALETTE, FONT_FAMILY, IDENTITY, GITHUB_LOGIN } from "./config.mjs";
import { buildIdentityGroup } from "./render-identity.mjs";
import { buildSkillsGroup } from "./render-skills.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function main() {
  const data = JSON.parse(readFileSync(path.join(__dirname, "..", "data.json"), "utf8"));
  const width = IDENTITY.width;

  // --- Section 1: timestamp line ---
  const stampLineH = 44;
  const stampText = `Last synced: ${data.generatedAt} • ${data.totalContributions} contributions • ${data.publicRepos} public repos`;
  const stampMarkup = `<text x="28" y="28" font-size="13" fill="${PALETTE.muted}" font-family="${FONT_FAMILY}">${esc(
    stampText
  )}</text>`;

  // --- Section 2: identity (whoami + ps --projects) ---
  const identityOffset = stampLineH;
  const identity = buildIdentityGroup(data, identityOffset);

  // --- Section 3: skills --progress ---
  const skillsOffset = identityOffset + identity.height;
  const skills = buildSkillsGroup(skillsOffset);

  // --- Section 4: closing line ---
  const closingOffset = skillsOffset + skills.height;
  const closingLineH = 44;
  const closingText = `SESSION ACTIVE • ${GITHUB_LOGIN.toUpperCase()}`;
  const closingMarkup = `<text x="28" y="${
    closingOffset + 28
  }" font-size="14" font-weight="bold" fill="${PALETTE.accent}" font-family="${FONT_FAMILY}">${esc(closingText)}</text>`;

  const height = closingOffset + closingLineH;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${PALETTE.background}" />
  <rect x="4" y="4" width="${width - 8}" height="${height - 8}" fill="none" stroke="${PALETTE.muted}" stroke-width="1" />
  ${stampMarkup}
  ${identity.markup}
  ${skills.markup}
  ${closingMarkup}
</svg>
`;

  const outPath = path.join(__dirname, "..", "assets", "generated", "panel.svg");
  writeFileSync(outPath, svg);
  console.log(`Wrote ${outPath} (${svg.length} bytes)`);
}

main();
