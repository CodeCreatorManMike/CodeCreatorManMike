// Renders assets/generated/stats.svg: system diagnostics panel with
// repo/contribution/follower/language counts + a monthly activity sparkline.
// Plain SVG string output, no canvas needed.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PALETTE, FONT_FAMILY, STATS } from "./config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(path.join(__dirname, "..", "data.json"), "utf8"));

const { width, height } = STATS;

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// --- Sparkline from months ---
const months = data.months;
const sparkX = 40;
const sparkY = 300;
const sparkW = width - 80;
const sparkH = 80;
const maxTotal = Math.max(1, ...months.map((m) => m.total));
const stepX = months.length > 1 ? sparkW / (months.length - 1) : sparkW;

const points = months.map((m, i) => {
  const x = sparkX + i * stepX;
  const y = sparkY + sparkH - (m.total / maxTotal) * sparkH;
  return `${x.toFixed(1)},${y.toFixed(1)}`;
});
const sparkPath = `M ${points.join(" L ")}`;
const sparkArea = `M ${sparkX},${sparkY + sparkH} L ${points.join(" L ")} L ${(
  sparkX + (months.length - 1) * stepX
).toFixed(1)},${sparkY + sparkH} Z`;

const sparkDots = months
  .map((m, i) => {
    const x = sparkX + i * stepX;
    const y = sparkY + sparkH - (m.total / maxTotal) * sparkH;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" fill="${PALETTE.accent}" />`;
  })
  .join("\n    ");

const monthLabels = months
  .map((m, i) => {
    const x = sparkX + i * stepX;
    if (i % 2 !== 0 && months.length > 8) return "";
    return `<text x="${x.toFixed(1)}" y="${sparkY + sparkH + 18}" font-size="10" fill="${
      PALETTE.muted
    }" text-anchor="middle" font-family="${FONT_FAMILY}">${esc(m.month.slice(5))}</text>`;
  })
  .join("\n    ");

// --- Language bars ---
const langs = data.languages.slice(0, 6);
const barX = 40;
const barTop = 130;
const barH = 16;
const barGap = 12;
const barMaxW = width - 80 - 160;

const langBars = langs
  .map((l, i) => {
    const y = barTop + i * (barH + barGap);
    const w = Math.max(2, (l.pct / 100) * barMaxW);
    const color = i === 0 ? PALETTE.accent : i === 1 ? PALETTE.highlight : PALETTE.text;
    return `
    <text x="${barX}" y="${y + barH - 3}" font-size="13" fill="${PALETTE.text}" font-family="${FONT_FAMILY}">${esc(
      l.name
    )}</text>
    <rect x="${barX + 140}" y="${y}" width="${barMaxW}" height="${barH}" fill="${PALETTE.panel}" stroke="${
      PALETTE.muted
    }" stroke-width="1" />
    <rect x="${barX + 140}" y="${y}" width="${w.toFixed(1)}" height="${barH}" fill="${color}" />
    <text x="${barX + 150 + barMaxW}" y="${y + barH - 3}" font-size="12" fill="${PALETTE.muted}" font-family="${FONT_FAMILY}">${l.pct}%</text>`;
  })
  .join("\n");

const diagRow = (label, value, x, y) => `
    <text x="${x}" y="${y}" font-size="13" fill="${PALETTE.muted}" font-family="${FONT_FAMILY}">${esc(
  label
)}</text>
    <text x="${x}" y="${y + 22}" font-size="24" font-weight="bold" fill="${PALETTE.accent}" font-family="${FONT_FAMILY}">${esc(
  value
)}</text>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${PALETTE.background}" />
  <rect x="4" y="4" width="${width - 8}" height="${height - 8}" fill="none" stroke="${PALETTE.muted}" stroke-width="1" />

  <text x="24" y="34" font-size="20" font-weight="bold" fill="${PALETTE.accent}" font-family="${FONT_FAMILY}">&gt; system --diagnostics</text>
  <line x1="24" y1="46" x2="${width - 24}" y2="46" stroke="${PALETTE.muted}" stroke-width="1" opacity="0.4" />

  ${diagRow("CONTRIBUTIONS (1y)", data.totalContributions.toLocaleString(), 24, 80)}
  ${diagRow("PUBLIC REPOS", String(data.publicRepos), 240, 80)}
  ${diagRow("FOLLOWERS", String(data.followers), 420, 80)}
  ${diagRow("CURRENT STREAK", `${data.currentStreak}d`, 600, 80)}
  ${diagRow("LANGUAGES", String(data.languages.length), 760, 80)}

  <text x="24" y="118" font-size="14" fill="${PALETTE.highlight}" font-family="${FONT_FAMILY}">&gt; stack --list</text>
  ${langBars}

  <text x="24" y="${sparkY - 12}" font-size="14" fill="${PALETTE.highlight}" font-family="${FONT_FAMILY}">&gt; activity --monthly</text>
  <path d="${sparkArea}" fill="${PALETTE.accent}" opacity="0.12" />
  <path d="${sparkPath}" fill="none" stroke="${PALETTE.accent}" stroke-width="2" />
  ${sparkDots}
  ${monthLabels}
  <line x1="${sparkX}" y1="${sparkY + sparkH}" x2="${sparkX + sparkW}" y2="${sparkY + sparkH}" stroke="${
  PALETTE.muted
}" stroke-width="1" opacity="0.5" />

  <text x="24" y="${height - 16}" font-size="11" fill="${PALETTE.muted}" font-family="${FONT_FAMILY}">generated ${esc(
  data.generatedAt
)} • source: github graphql api</text>
</svg>
`;

const outPath = path.join(__dirname, "..", "assets", "generated", "stats.svg");
writeFileSync(outPath, svg);
console.log(`Wrote ${outPath} (${svg.length} bytes)`);
