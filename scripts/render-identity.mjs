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

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const statusFor = (repo) => (repo.archived ? "ARCHIVED" : "RUNNING");

// Builds the identity+projects content group (no outer <svg>/background rect,
// no border), so it can be stitched into a larger combined panel by
// render-page.mjs. `yOffset` shifts every coordinate down so the section can
// be placed anywhere on a taller combined canvas. Returns { markup, height }
// where height is the total vertical space this section occupies.
// Shared left gutter used consistently across every sub-section (whoami,
// ps --projects, skills, stamp/closing lines in render-page.mjs) so the
// whole panel reads with one clean left edge.
const MARGIN = 28;

// Builds a "LABEL ........ VALUE" dot-leader run. The font is a fixed-width
// monospace stack, so padding by character count lines columns up reliably
// without measuring text.
function dotLeader(label, fieldChars) {
  const dots = Math.max(3, fieldChars - label.length - 1);
  return `${label} ${".".repeat(dots)}`;
}

export function buildIdentityGroup(data, yOffset = 0) {
  const { width } = IDENTITY;
  const pinned = data.pinned || [];
  const Y = (v) => v + yOffset;

  // --- Vertical rhythm constants (shared shape across both zones below) ---
  const headerY = 34; // section prompt baseline, e.g. "> whoami"
  const underlineY = headerY + 12; // thin rule right under every header
  const contentTopGap = 32; // gap from underline to first line of content

  // --- Zone 1: whoami (lead with who they are + key skills first) ---
  const skillsLineY = underlineY + contentTopGap; // 78
  const headlineY = skillsLineY + 24; // 102
  const focusLineY = headlineY + 22; // 124
  const metaRowY = focusLineY + 34; // 158 — a touch more air before the meta row
  const sectionDivY = metaRowY + 32; // 190 — separator before ps --projects

  const whoami = `
  <text x="${MARGIN}" y="${Y(headerY)}" font-size="16" font-weight="bold" fill="${PALETTE.accent}" font-family="${FONT_FAMILY}">&gt; whoami</text>
  <line x1="${MARGIN}" y1="${Y(underlineY)}" x2="${width - MARGIN}" y2="${Y(underlineY)}" stroke="${PALETTE.muted}" stroke-width="1" opacity="0.4" />

  <text x="${MARGIN}" y="${Y(skillsLineY)}" font-size="17" font-weight="bold" fill="${PALETTE.text}" font-family="${FONT_FAMILY}">${esc(
    BIO.skillsLine
  )}</text>
  <text x="${MARGIN}" y="${Y(headlineY)}" font-size="14" fill="${PALETTE.highlight}" font-family="${FONT_FAMILY}">${esc(
    BIO.headline
  )}</text>
  <text x="${MARGIN}" y="${Y(focusLineY)}" font-size="13" fill="${PALETTE.muted}" font-family="${FONT_FAMILY}">${esc(
    BIO.focusLine
  )}</text>

  <text x="${MARGIN}" y="${Y(metaRowY)}" font-size="13" fill="${PALETTE.muted}" font-family="${FONT_FAMILY}">${esc(
    dotLeader("LOCATION", 16)
  )}</text>
  <text x="${MARGIN + 158}" y="${Y(metaRowY)}" font-size="13" fill="${PALETTE.text}" font-family="${FONT_FAMILY}">${esc(BIO.location)}</text>
  <text x="${MARGIN + 300}" y="${Y(metaRowY)}" font-size="13" fill="${PALETTE.muted}" font-family="${FONT_FAMILY}">${esc(
    dotLeader("STATUS", 14)
  )}</text>
  <text x="${MARGIN + 420}" y="${Y(metaRowY)}" font-size="13" fill="${PALETTE.accent}" font-family="${FONT_FAMILY}">${esc(BIO.status)}
    <animate attributeName="opacity" values="1;0.35;1" dur="1.6s" repeatCount="indefinite" />
  </text>
  <rect x="${MARGIN + 480}" y="${Y(metaRowY - 11)}" width="9" height="14" fill="${PALETTE.accent}">
    <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />
  </rect>

  <line x1="${MARGIN}" y1="${Y(sectionDivY)}" x2="${width - MARGIN}" y2="${Y(sectionDivY)}" stroke="${
    PALETTE.muted
  }" stroke-width="1" opacity="0.3" />`;

  // --- Zone 2: ps --projects (same panel, clearly separated section) ---
  const header2Y = sectionDivY + 32; // 222
  const underline2Y = header2Y + 12; // 234
  const tableHeaderY = underline2Y + 28; // 262
  const tableRuleY = tableHeaderY + 12; // 274
  const rowStart = tableRuleY + 28; // 302
  const projectRowH = 32;

  const projectsHeader = `
  <text x="${MARGIN}" y="${Y(header2Y)}" font-size="16" font-weight="bold" fill="${PALETTE.accent}" font-family="${FONT_FAMILY}">&gt; ps --projects</text>
  <line x1="${MARGIN}" y1="${Y(underline2Y)}" x2="${width - MARGIN}" y2="${Y(underline2Y)}" stroke="${
    PALETTE.muted
  }" stroke-width="1" opacity="0.4" />`;

  const colPid = MARGIN;
  const colName = MARGIN + 76;
  const colType = MARGIN + 402;
  const colStatus = MARGIN + 532;

  const headerRow = `
  <text x="${colPid}" y="${Y(tableHeaderY)}" font-size="11" fill="${PALETTE.muted}" font-family="${FONT_FAMILY}">PID</text>
  <text x="${colName}" y="${Y(tableHeaderY)}" font-size="11" fill="${PALETTE.muted}" font-family="${FONT_FAMILY}">PROJECT</text>
  <text x="${colType}" y="${Y(tableHeaderY)}" font-size="11" fill="${PALETTE.muted}" font-family="${FONT_FAMILY}">TYPE</text>
  <text x="${colStatus}" y="${Y(tableHeaderY)}" font-size="11" fill="${PALETTE.muted}" font-family="${FONT_FAMILY}">STATUS</text>
  <line x1="${MARGIN}" y1="${Y(tableRuleY)}" x2="${width - MARGIN}" y2="${Y(tableRuleY)}" stroke="${
    PALETTE.muted
  }" stroke-width="1" opacity="0.3" />`;

  const rows = pinned
    .map((repo, i) => {
      const y = Y(rowStart + i * projectRowH);
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

  const lastRowY = rowStart + Math.max(0, pinned.length - 1) * projectRowH;
  const contentHeight = lastRowY + 56;
  const height = Math.max(IDENTITY.height, contentHeight);

  const footer = `<text x="${MARGIN}" y="${Y(height - 16)}" font-size="11" fill="${PALETTE.muted}" font-family="${FONT_FAMILY}">generated ${esc(
    data.generatedAt
  )} • source: github graphql api</text>`;

  const markup = `${whoami}\n${projectsHeader}\n${headerRow}\n${rows}\n${footer}`;

  return { markup, height, width };
}

function main() {
  const data = JSON.parse(readFileSync(path.join(__dirname, "..", "data.json"), "utf8"));
  const { markup, height, width } = buildIdentityGroup(data, 0);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${PALETTE.background}" />
  <rect x="4" y="4" width="${width - 8}" height="${height - 8}" fill="none" stroke="${PALETTE.muted}" stroke-width="1" />
  ${markup}
</svg>
`;

  const outPath = path.join(__dirname, "..", "assets", "generated", "identity.svg");
  writeFileSync(outPath, svg);
  console.log(`Wrote ${outPath} (${svg.length} bytes)`);
}

if (path.resolve(process.argv[1] || "") === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
