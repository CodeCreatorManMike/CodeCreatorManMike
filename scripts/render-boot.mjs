// Renders assets/generated/boot.gif: "CODECREATORMANMIKE" builds char-by-char
// terminal style, one CRT glitch frame, settles, "SYSTEM READY." then loops.
import { createCanvas } from "canvas";
import GIFEncoder from "gif-encoder-2";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PALETTE, FONT_FAMILY, BOOT } from "./config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { width, height, fps, totalFrames, glitchFrame, text, readyText } = BOOT;

const encoder = new GIFEncoder(width, height, "neuquant", true);
encoder.start();
encoder.setRepeat(0);
encoder.setDelay(Math.round(1000 / fps));
encoder.setQuality(10);

const canvas = createCanvas(width, height);
const ctx = canvas.getContext("2d");

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
  ctx.font = `bold 42px ${FONT_FAMILY}`;

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
    // CRT glitch: RGB channel split + jitter
    const y = height / 2 - 30;
    const x = 40;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "#ff2b4d";
    ctx.fillText(fullLine, x - 3, y + (Math.random() * 4 - 2));
    ctx.fillStyle = "#58A6FF";
    ctx.fillText(fullLine, x + 3, y + (Math.random() * 4 - 2));
    ctx.fillStyle = PALETTE.accent;
    ctx.fillText(fullLine, x, y);
    ctx.restore();
    // glitch noise bars
    for (let i = 0; i < 6; i++) {
      const gy = Math.random() * height;
      ctx.fillStyle = "rgba(57,255,136,0.08)";
      ctx.fillRect(0, gy, width, 2 + Math.random() * 4);
    }
  } else {
    ctx.fillText(fullLine, 40, height / 2 - 30);
    if (phase === "building" && cursorOn) {
      const w = ctx.measureText(fullLine).width;
      ctx.fillRect(40 + w + 4, height / 2 - 48, 14, 36);
    }
  }

  // Second line: status text
  ctx.font = `20px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.muted;
  if (phase === "building") {
    ctx.fillText("initializing kernel modules...", 40, height / 2 + 20);
  } else if (phase === "glitch") {
    ctx.fillStyle = "#ff2b4d";
    ctx.fillText("!! signal desync !!", 40, height / 2 + 20);
  } else {
    ctx.fillStyle = PALETTE.highlight;
    ctx.fillText(readyText, 40, height / 2 + 20);
    if (frameIdx % 6 < 3) {
      const w = ctx.measureText(readyText).width;
      ctx.fillStyle = PALETTE.accent;
      ctx.fillRect(40 + w + 8, height / 2 + 6, 12, 20);
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
