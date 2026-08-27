// Renders assets/generated/boot.gif: a single looping scene — the large
// figlet block-letter ASCII-art wordmark "CODECREATORMANMIKE" fades in,
// holds bright, flashes/pulses like an active loading/neon-sign flicker,
// holds again, then loops. No terminal buildup/kernel-text phase anymore.
import { createCanvas } from "canvas";
import GIFEncoder from "gif-encoder-2";
import figlet from "figlet";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PALETTE, FONT_FAMILY, BOOT } from "./config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { width, height, fps, totalFrames, readyText, figletFont, text } = BOOT;

const encoder = new GIFEncoder(width, height, "neuquant", true);
encoder.start();
encoder.setRepeat(0);
encoder.setDelay(Math.round(1000 / fps));
encoder.setQuality(10);

const canvas = createCanvas(width, height);
const ctx = canvas.getContext("2d");

// --- Figlet wordmark ------------------------------------------------------
// Generate once, as a single string so there's no risk of multi-word
// overlap, then drop fully-blank leading/trailing rows the font emits.
const rawFigletLines = figlet
  .textSync(text, { font: figletFont, horizontalLayout: "fitted" })
  .split("\n");
let figletStart = 0;
let figletEnd = rawFigletLines.length;
while (figletStart < figletEnd && rawFigletLines[figletStart].trim() === "") figletStart++;
while (figletEnd > figletStart && rawFigletLines[figletEnd - 1].trim() === "") figletEnd--;
const figletLines = rawFigletLines.slice(figletStart, figletEnd);

const FIGLET_MARGIN_X = 32;
const FIGLET_MAX_WIDTH = width - FIGLET_MARGIN_X * 2;
const FIGLET_MAX_HEIGHT = height - 130; // leave room for status line + footer

// Pick the largest monospace font size where every figlet line still fits
// within FIGLET_MAX_WIDTH/HEIGHT, so the wordmark always renders as one
// unbroken line — never wrapped or cut off — regardless of exact font
// metrics on the machine that renders the GIF.
function fitFigletFontSize() {
  ctx.textBaseline = "top";
  for (let size = 72; size >= 6; size--) {
    ctx.font = `${size}px ${FONT_FAMILY}`;
    const widest = Math.max(...figletLines.map((l) => ctx.measureText(l).width));
    const lineHeight = size * 1.05;
    const blockHeight = lineHeight * figletLines.length;
    if (widest <= FIGLET_MAX_WIDTH && blockHeight <= FIGLET_MAX_HEIGHT) {
      return { size, lineHeight, widest, blockHeight };
    }
  }
  return { size: 6, lineHeight: 6 * 1.05, widest: FIGLET_MAX_WIDTH, blockHeight: FIGLET_MAX_HEIGHT };
}

const { size: figletFontSize, lineHeight: figletLineHeight, blockHeight: figletBlockHeight } =
  fitFigletFontSize();

// Bright, high-contrast core color (soft off-white with a green tint) plus
// a phosphor-green glow behind it, so the dense Fraktur glyphs read clearly
// against the dark background instead of muddying into a black block.
const CORE_BRIGHT = "#EAFFF4";

function drawFigletWordmark(alpha = 1, glowStrength = 1, coreColor = CORE_BRIGHT) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textBaseline = "top";
  ctx.textAlign = "center";
  ctx.font = `${figletFontSize}px ${FONT_FAMILY}`;
  const startY = (height - 110 - figletBlockHeight) / 2 + 10;

  // Glow pass: accent-colored blur behind the glyphs.
  ctx.shadowColor = PALETTE.accent;
  ctx.shadowBlur = 18 * glowStrength;
  ctx.fillStyle = PALETTE.accent;
  figletLines.forEach((line, i) => {
    ctx.fillText(line, width / 2, startY + i * figletLineHeight);
  });
  // Second glow pass for extra bloom on flash frames.
  if (glowStrength > 1) {
    ctx.shadowBlur = 34 * (glowStrength - 1) + 18;
    figletLines.forEach((line, i) => {
      ctx.fillText(line, width / 2, startY + i * figletLineHeight);
    });
  }

  // Crisp bright core on top, no shadow, for sharp readable edges.
  ctx.shadowBlur = 0;
  ctx.fillStyle = coreColor;
  figletLines.forEach((line, i) => {
    ctx.fillText(line, width / 2, startY + i * figletLineHeight);
  });

  ctx.restore();
  ctx.textAlign = "left";
}

function drawPanelBg() {
  ctx.fillStyle = PALETTE.background;
  ctx.fillRect(0, 0, width, height);
  // subtle scanlines
  ctx.strokeStyle = "rgba(255,255,255,0.02)";
  for (let y = 0; y < height; y += 3) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  // panel border
  ctx.strokeStyle = PALETTE.muted;
  ctx.lineWidth = 1;
  ctx.strokeRect(4, 4, width - 8, height - 8);
}

// --- Timeline (single scene, loops) ---------------------------------------
// fade-in -> hold bright -> flash/pulse -> hold bright -> loop
const FADE_IN_FRAMES = Math.round(totalFrames * 0.22); // ~fade in
const HOLD1_FRAMES = Math.round(totalFrames * 0.22); // hold bright
const PULSE_FRAMES = Math.round(totalFrames * 0.32); // flash/pulse
// remainder holds bright again before looping

function drawFrame(frameIdx) {
  drawPanelBg();

  let alpha = 1;
  let glowStrength = 1;
  let coreColor = CORE_BRIGHT;

  if (frameIdx < FADE_IN_FRAMES) {
    // Fade in from black.
    alpha = (frameIdx + 1) / FADE_IN_FRAMES;
    glowStrength = 0.6 + 0.4 * alpha;
  } else if (frameIdx < FADE_IN_FRAMES + HOLD1_FRAMES) {
    // Hold, fully bright and readable.
    alpha = 1;
    glowStrength = 1;
  } else if (frameIdx < FADE_IN_FRAMES + HOLD1_FRAMES + PULSE_FRAMES) {
    // Flash/pulse like an active loading beacon: brightness oscillates,
    // with occasional brief flashes to bright white-green for a
    // CRT/neon-sign flicker feel, while staying legible throughout.
    const t = frameIdx - (FADE_IN_FRAMES + HOLD1_FRAMES);
    const cyclePos = t % 4; // fast little flicker cycle
    if (cyclePos === 0) {
      // bright flash beat
      alpha = 1;
      glowStrength = 1.9;
      coreColor = "#FFFFFF";
    } else if (cyclePos === 1) {
      alpha = 0.72;
      glowStrength = 0.7;
    } else {
      alpha = 1;
      glowStrength = 1.1;
    }
  } else {
    // Final hold, bright and steady before the loop restarts.
    alpha = 1;
    glowStrength = 1;
  }

  drawFigletWordmark(alpha, glowStrength, coreColor);

  // Status/footer line.
  ctx.font = `20px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.highlight;
  ctx.fillText(readyText, 40, height - 64);
  if (frameIdx % 6 < 3) {
    const w = ctx.measureText(readyText).width;
    ctx.fillStyle = PALETTE.accent;
    ctx.fillRect(40 + w + 8, height - 80, 12, 20);
  }

  ctx.font = `14px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(`root@github:~$ boot.sh  [${frameIdx + 1}/${totalFrames}]`, 40, height - 24);
}

for (let f = 0; f < totalFrames; f++) {
  drawFrame(f);
  encoder.addFrame(ctx);
}

encoder.finish();
const buf = encoder.out.getData();
const outPath = path.join(__dirname, "..", "assets", "generated", "boot.gif");
writeFileSync(outPath, buf);
console.log(`Wrote ${outPath} (${buf.length} bytes)`);
