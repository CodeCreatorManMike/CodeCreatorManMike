// Renders assets/generated/skills.svg: animated skill-progress bars using the
// fixed hand-set values in config.mjs (NOT computed from repo language bytes).
// Same dark panel style as the rest of the profile (border, palette, font).
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PALETTE, FONT_FAMILY, SKILLS } from "./config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Builds the skill-bars content group (no outer <svg>/background rect, no
// border), so it can be stitched into a larger combined panel by
// render-page.mjs. `yOffset` shifts every coordinate down.
const MARGIN = 28;

// Single dominant accent (phosphor green) for every filled bar, at an
// opacity that scales with the percentage — a deliberate intensity ramp
// instead of three unrelated hues, so 100% reads brightest and lower
// percentages read dimmer while still using the same one color.
const TRACK_FILL = "#1c2530"; // a shade lighter than the #111820 panel bg
function fillOpacityFor(pct) {
  return (0.45 + 0.55 * (pct / 100)).toFixed(2);
}

export function buildSkillsGroup(yOffset = 0) {
  const { width, list } = SKILLS;
  const Y = (v) => v + yOffset;

  const headerY = 34;
  const underlineY = headerY + 12; // 46
  const barTop = underlineY + 32; // 78 — matches the whoami content rhythm
  const barX = MARGIN + 162;
  const barH = 18;
  const barGap = 24;
  const barMaxW = width - MARGIN - barX - 66;
  const contentHeight = barTop + list.length * (barH + barGap) + 40;
  const height = Math.max(SKILLS.height, contentHeight);

  const bars = list
    .map((s, i) => {
      const y = Y(barTop + i * (barH + barGap));
      const w = Math.max(2, (s.pct / 100) * barMaxW);
      const opacity = fillOpacityFor(s.pct);
      const dur = (1 + i * 0.15).toFixed(2);
      return `
  <text x="${MARGIN}" y="${y + barH - 4}" font-size="14" fill="${PALETTE.text}" font-family="${FONT_FAMILY}">${esc(
        s.name
      )}</text>
  <rect x="${barX}" y="${y}" width="${barMaxW}" height="${barH}" rx="3" fill="${TRACK_FILL}" stroke="${
        PALETTE.muted
      }" stroke-width="1" stroke-opacity="0.35" />
  <rect x="${barX}" y="${y}" width="0" height="${barH}" rx="3" fill="${PALETTE.accent}" fill-opacity="${opacity}">
    <animate attributeName="width" from="0" to="${w.toFixed(1)}" dur="${dur}s" begin="0s" fill="freeze" calcMode="spline" keySplines="0.2 0 0.2 1" />
  </rect>
  <text x="${barX + barMaxW + 12}" y="${y + barH - 4}" font-size="13" fill="${PALETTE.muted}" font-family="${FONT_FAMILY}">${s.pct}%</text>`;
    })
    .join("\n");

  const header = `
  <text x="${MARGIN}" y="${Y(headerY)}" font-size="16" font-weight="bold" fill="${PALETTE.accent}" font-family="${FONT_FAMILY}">&gt; skills --progress</text>
  <line x1="${MARGIN}" y1="${Y(underlineY)}" x2="${width - MARGIN}" y2="${Y(underlineY)}" stroke="${PALETTE.muted}" stroke-width="1" opacity="0.4" />`;

  const footer = `<text x="${MARGIN}" y="${Y(height - 16)}" font-size="11" fill="${PALETTE.muted}" font-family="${FONT_FAMILY}">learning progress • hand-tracked, updated manually in scripts/config.mjs</text>`;

  const markup = `${header}\n${bars}\n${footer}`;

  return { markup, height, width };
}

function main() {
  const { markup, height, width } = buildSkillsGroup(0);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${PALETTE.background}" />
  <rect x="4" y="4" width="${width - 8}" height="${height - 8}" fill="none" stroke="${PALETTE.muted}" stroke-width="1" />
  ${markup}
</svg>
`;

  const outPath = path.join(__dirname, "..", "assets", "generated", "skills.svg");
  writeFileSync(outPath, svg);
  console.log(`Wrote ${outPath} (${svg.length} bytes)`);
}

if (path.resolve(process.argv[1] || "") === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
