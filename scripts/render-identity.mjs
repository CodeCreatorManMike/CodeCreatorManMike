// Renders assets/generated/identity.svg: ONE merged dark panel combining the
// `whoami` identity block and the `ps --projects` pinned-repo list, styled
// identically to the other panels (same border/corner treatment, palette,
// monospace font) so it reads as part of the same continuous terminal view.
// Plain SVG string output, no canvas needed.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PALETTE, FONT_FAMILY, BIO, IDENTITY } from "./config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(path.join(__dirname, "..", "data.json"), "utf8"));

const { width } = IDENTITY;

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const pinned = data.pinned || [];
const projectRowH = 30;
const projectsTop = 232;
const height = Math.max(IDENTITY.height, projectsTop + pinned.length * projectRowH + 40);

const statusFor = (repo) => (repo.archived ? "ARCHIVED" : "RUNNING");

// --- Zone 1: whoami (lead with who they are + key skills first) ---
const whoami = `
  <text x="24" y="34" font-size="20" font-weight="bold" fill="${PALETTE.accent}" font-family="${FONT_FAMILY}">&gt; whoami</text>
  <line x1="24" y1="46" x2="${width - 24}" y2="46" stroke="${PALETTE.muted}" stroke-width="1" opacity="0.4" />

  <text x="24" y="78" font-size="17" font-weight="bold" fill="${PALETTE.text}" font-family="${FONT_FAMILY}">${esc(
  BIO.skillsLine
)}</text>
  <text x="24" y="104" font-size="14" fill="${PALETTE.highlight}" font-family="${FONT_FAMILY}">${esc(
  BIO.headline
)}</text>
  <text x="24" y="128" font-size="13" fill="${PALETTE.muted}" font-family="${FONT_FAMILY}">${esc(
  BIO.focusLine
)}</text>

  <text x="24" y="160" font-size="13" fill="${PALETTE.muted}" font-family="${FONT_FAMILY}">LOCATION</text>
  <text x="150" y="160" font-size="13" fill="${PALETTE.text}" font-family="${FONT_FAMILY}">${esc(BIO.location)}</text>
  <text x="300" y="160" font-size="13" fill="${PALETTE.muted}" font-family="${FONT_FAMILY}">STATUS</text>
  <text x="410" y="160" font-size="13" fill="${PALETTE.accent}" font-family="${FONT_FAMILY}">${esc(BIO.status)}
    <animate attributeName="opacity" values="1;0.35;1" dur="1.6s" repeatCount="indefinite" />
  </text>
  <rect x="470" y="149" width="9" height="14" fill="${PALETTE.accent}">
    <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />
  </rect>`;

// --- Zone 2: ps --projects (same panel, clearly separated section) ---
const sectionDivY = 190;
const projectsHeader = `
  <line x1="24" y1="${sectionDivY}" x2="${width - 24}" y2="${sectionDivY}" stroke="${
  PALETTE.muted
}" stroke-width="1" opacity="0.25" />
  <text x="24" y="216" font-size="14" fill="${PALETTE.highlight}" font-family="${FONT_FAMILY}">&gt; ps --projects</text>`;

const colPid = 24;
const colName = 100;
const colType = 430;
const colStatus = 560;

const headerRow = `
  <text x="${colPid}" y="${projectsTop - 6}" font-size="11" fill="${PALETTE.muted}" font-family="${FONT_FAMILY}">PID</text>
  <text x="${colName}" y="${projectsTop - 6}" font-size="11" fill="${PALETTE.muted}" font-family="${FONT_FAMILY}">PROJECT</text>
  <text x="${colType}" y="${projectsTop - 6}" font-size="11" fill="${PALETTE.muted}" font-family="${FONT_FAMILY}">TYPE</text>
  <text x="${colStatus}" y="${projectsTop - 6}" font-size="11" fill="${PALETTE.muted}" font-family="${FONT_FAMILY}">STATUS</text>
  <line x1="24" y1="${projectsTop - 14}" x2="${width - 24}" y2="${projectsTop - 14}" stroke="${
  PALETTE.muted
}" stroke-width="1" opacity="0.3" />`;

const rows = pinned
  .map((repo, i) => {
    const y = projectsTop + i * projectRowH;
    const pid = String(1000 + i);
    const status = statusFor(repo);
    const statusColor = status === "RUNNING" ? PALETTE.accent : PALETTE.muted;
    return `
  <text x="${colPid}" y="${y}" font-size="13" fill="${PALETTE.muted}" font-family="${FONT_FAMILY}">${pid}</text>
  <text x="${colName}" y="${y}" font-size="13" fill="${PALETTE.text}" font-family="${FONT_FAMILY}">${esc(
      repo.name
    )}</text>
  <text x="${colType}" y="${y}" font-size="13" fill="${PALETTE.highlight}" font-family="${FONT_FAMILY}">${esc(
      repo.language || "—"
    )}</text>
  <text x="${colStatus}" y="${y}" font-size="13" fill="${statusColor}" font-family="${FONT_FAMILY}">${status}</text>`;
  })
  .join("\n");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${PALETTE.background}" />
  <rect x="4" y="4" width="${width - 8}" height="${height - 8}" fill="none" stroke="${PALETTE.muted}" stroke-width="1" />
  ${whoami}
  ${projectsHeader}
  ${headerRow}
  ${rows}
  <text x="24" y="${height - 16}" font-size="11" fill="${PALETTE.muted}" font-family="${FONT_FAMILY}">generated ${esc(
  data.generatedAt
)} • source: github graphql api</text>
</svg>
`;

const outPath = path.join(__dirname, "..", "assets", "generated", "identity.svg");
writeFileSync(outPath, svg);
console.log(`Wrote ${outPath} (${svg.length} bytes)`);
