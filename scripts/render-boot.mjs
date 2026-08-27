// Renders assets/generated/boot.gif: "CODECREATORMANMIKE" builds char-by-char
// terminal style, one CRT glitch frame, then settles into a large figlet
// block-letter ASCII art wordmark, holds on "SYSTEM READY." then loops.
import { createCanvas } from "canvas";
import GIFEncoder from "gif-encoder-2";
import figlet from "figlet";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PALETTE, FONT_FAMILY, BOOT } from "./config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { width, height, fps, totalFrames, glitchFrame, text, readyText, figletFont } = BOOT;

const encoder = new GIFEncoder(width, height, "neuquant", true);
encoder.start();
encoder.setRepeat(0);
encoder.setDelay(Math.round(1000 / fps));
encoder.setQuality(10);

const canvas = createCanvas(width, height);
const ctx = canvas.getContext("2d");

// --- Figlet wordmark (used for the settled/glitch reveal) ---------------
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

function drawFigletWordmark(fillStyle, offsetX = 0, offsetY = 0, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textBaseline = "top";
  ctx.textAlign = "center";
  ctx.font = `${figletFontSize}px ${FONT_FAMILY}`;
  ctx.fillStyle = fillStyle;
  const startY = (height - 110 - figletBlockHeight) / 2 + 10;
  figletLines.forEach((line, i) => {
    ctx.fillText(line, width / 2 + offsetX, startY + i * figletLineHeight + offsetY);
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

function drawFrame(frameIdx) {
  drawPanelBg();
  ctx.textBaseline = "middle";

  // Build-up phase: reveal one char every ~2 frames until whole text shown
  const buildFrames = text.length * 2;
  const cursorOn = frameIdx % 6 < 3;

  let charsToShow;
  let phase;
  if (frameIdx < buildFrames) {
    phase = "building";
    charsToShow = Math.min(text.length, Math.floor(frameIdx / 2) + 1);
  } else if (frameIdx === glitchFrame) {
    phase = "glitch";
    charsToShow = text.length;
  } else {
    phase = "settled";
    charsToShow = text.length;
  }

  const shown = text.slice(0, charsToShow);
  const promptPrefix = "> ";

  ctx.fillStyle = PALETTE.accent;
  const fullLine = promptPrefix + shown;

  if (phase === "glitch") {
    // CRT glitch: RGB channel split + jitter, applied to the figlet wordmark
    const jx = Math.random() * 4 - 2;
    const jy = Math.random() * 4 - 2;
    drawFigletWordmark("#ff2b4d", -3 + jx, jy, 0.85);
    drawFigletWordmark("#58A6FF", 3 + jx, jy, 0.85);
    drawFigletWordmark(PALETTE.accent, 0, 0, 1);
    // glitch noise bars
    for (let i = 0; i < 6; i++) {
      const gy = Math.random() * height;
      ctx.fillStyle = "rgba(57,255,136,0.08)";
      ctx.fillRect(0, gy, width, 2 + Math.random() * 4);
    }
  } else if (phase === "settled") {
    drawFigletWordmark(PALETTE.accent);
  } else {
    ctx.font = `bold 42px ${FONT_FAMILY}`;
    ctx.fillText(fullLine, 40, height / 2 - 30);
    if (cursorOn) {
      const w = ctx.measureText(fullLine).width;
      ctx.fillRect(40 + w + 4, height / 2 - 48, 14, 36);
    }
  }

  // Status line: sits just above the footer, under the wordmark/build line
  ctx.font = `20px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.muted;
  if (phase === "building") {
    ctx.fillText("initializing kernel modules...", 40, height - 64);
  } else if (phase === "glitch") {
    ctx.fillStyle = "#ff2b4d";
    ctx.fillText("!! signal desync !!", 40, height - 64);
  } else {
    ctx.fillStyle = PALETTE.highlight;
    ctx.fillText(readyText, 40, height - 64);
    if (frameIdx % 6 < 3) {
      const w = ctx.measureText(readyText).width;
      ctx.fillStyle = PALETTE.accent;
      ctx.fillRect(40 + w + 8, height - 80, 12, 20);
    }
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
