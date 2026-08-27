// Renders assets/generated/skills.svg: animated skill-progress bars using the
// fixed hand-set values in config.mjs (NOT computed from repo language bytes).
// Same dark panel style as the rest of the profile (border, palette, font).
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PALETTE, FONT_FAMILY, SKILLS } from "./config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { width, list } = SKILLS;

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const barX = 190;
const barTop = 80;
const barH = 20;
const barGap = 20;
const barMaxW = width - 24 - barX - 70;
const height = Math.max(SKILLS.height, barTop + list.length * (barH + barGap) + 40);

const bars = list
  .map((s, i) => {
    const y = barTop + i * (barH + barGap);
    const w = Math.max(2, (s.pct / 100) * barMaxW);
    const color = s.pct >= 90 ? PALETTE.accent : s.pct >= 50 ? PALETTE.highlight : PALETTE.text;
    const dur = (1 + i * 0.15).toFixed(2);
    return `
  <text x="24" y="${y + barH - 5}" font-size="14" fill="${PALETTE.text}" font-family="${FONT_FAMILY}">${esc(
      s.name
    )}</text>
  <rect x="${barX}" y="${y}" width="${barMaxW}" height="${barH}" rx="2" fill="${PALETTE.panel}" stroke="${
      PALETTE.muted
    }" stroke-width="1" />
  <rect x="${barX}" y="${y}" width="0" height="${barH}" rx="2" fill="${color}">
    <animate attributeName="width" from="0" to="${w.toFixed(1)}" dur="${dur}s" begin="0s" fill="freeze" calcMode="spline" keySplines="0.2 0 0.2 1" />
  </rect>
  <text x="${barX + barMaxW + 12}" y="${y + barH - 5}" font-size="13" fill="${PALETTE.muted}" font-family="${FONT_FAMILY}">${s.pct}%</text>`;
  })
  .join("\n");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${PALETTE.background}" />
  <rect x="4" y="4" width="${width - 8}" height="${height - 8}" fill="none" stroke="${PALETTE.muted}" stroke-width="1" />

  <text x="24" y="34" font-size="20" font-weight="bold" fill="${PALETTE.accent}" font-family="${FONT_FAMILY}">&gt; skills --progress</text>
  <line x1="24" y1="46" x2="${width - 24}" y2="46" stroke="${PALETTE.muted}" stroke-width="1" opacity="0.4" />

  ${bars}

  <text x="24" y="${height - 16}" font-size="11" fill="${PALETTE.muted}" font-family="${FONT_FAMILY}">learning progress • hand-tracked, updated manually in scripts/config.mjs</text>
</svg>
`;

const outPath = path.join(__dirname, "..", "assets", "generated", "skills.svg");
writeFileSync(outPath, svg);
console.log(`Wrote ${outPath} (${svg.length} bytes)`);
