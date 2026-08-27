// Renders assets/generated/shooter.gif: an invader/space-shooter scene built
// from the REAL contribution calendar grid. Ship scans left->right, fires at
// lit squares, particle burst on hit, ends on a real stats card, then loops.
import { createCanvas } from "canvas";
import GIFEncoder from "gif-encoder-2";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PALETTE, FONT_FAMILY, SHOOTER } from "./config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, "..", "data.json");
const data = JSON.parse(readFileSync(dataPath, "utf8"));

const { width, height, fps, cellSize, cellGap, statsHoldFrames } = SHOOTER;

const weeks = data.weeks; // array of { days: [{date,count,weekday}] }
const numWeeks = weeks.length;
const gridW = numWeeks * (cellSize + cellGap);
const gridH = 7 * (cellSize + cellGap);
const gridX = Math.round((width - gridW) / 2);
const gridY = 40;

function intensityColor(count) {
  if (count === 0) return "#1b2530";
  if (count < 3) return "#1c6b4a";
  if (count < 6) return "#22a066";
  if (count < 10) return "#2ed57f";
  return PALETTE.accent;
}

// Determine which cells are "targets" (lit, count > 0), scanned column by column
const litCells = [];
weeks.forEach((w, wi) => {
  w.days.forEach((d, di) => {
    if (d.count > 0) litCells.push({ wi, di, count: d.count });
  });
});

const canvas = createCanvas(width, height);
const ctx = canvas.getContext("2d");

const encoder = new GIFEncoder(width, height, "neuquant", true);
encoder.start();
encoder.setRepeat(0);
encoder.setDelay(Math.round(1000 / fps));
encoder.setQuality(10);

function drawBg() {
  ctx.fillStyle = PALETTE.background;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = PALETTE.muted;
  ctx.lineWidth = 1;
  ctx.strokeRect(4, 4, width - 8, height - 8);
}

function drawGrid(hitSet) {
  for (let wi = 0; wi < numWeeks; wi++) {
    const days = weeks[wi].days;
    for (let di = 0; di < days.length; di++) {
      const d = days[di];
      const x = gridX + wi * (cellSize + cellGap);
      const y = gridY + di * (cellSize + cellGap);
      const key = `${wi}-${di}`;
      const destroyed = hitSet.has(key) && d.count > 0;
      ctx.fillStyle = destroyed ? "#0f1620" : intensityColor(d.count);
      ctx.fillRect(x, y, cellSize, cellSize);
      if (!destroyed && d.count > 0) {
        ctx.strokeStyle = "rgba(57,255,136,0.35)";
        ctx.strokeRect(x, y, cellSize, cellSize);
      }
    }
  }
}

function drawShip(cx, y) {
  ctx.fillStyle = PALETTE.accent;
  ctx.beginPath();
  ctx.moveTo(cx, y - 10);
  ctx.lineTo(cx - 10, y + 8);
  ctx.lineTo(cx, y + 3);
  ctx.lineTo(cx + 10, y + 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.highlight;
  ctx.fillRect(cx - 2, y + 8, 4, 6);
}

function drawParticles(particles) {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawHud(scanCol) {
  ctx.font = `13px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(`SCAN COL ${Math.min(scanCol, numWeeks)}/${numWeeks}`, gridX, gridY + gridH + 28);
  ctx.fillStyle = PALETTE.highlight;
  ctx.fillText(`TARGETS ${litCells.length}`, gridX + gridW - 140, gridY + gridH + 28);
}

function drawStatsCard() {
  drawBg();
  ctx.textBaseline = "middle";
  ctx.font = `bold 26px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.accent;
  ctx.fillText("> MISSION REPORT", 50, 55);

  const rows = [
    ["CONTRIBUTIONS", data.totalContributions.toLocaleString()],
    ["CURRENT STREAK", `${data.currentStreak}d`],
    ["PUBLIC REPOS", String(data.publicRepos)],
    ["FOLLOWERS", String(data.followers)],
  ];
  ctx.font = `19px ${FONT_FAMILY}`;
  let ry = 110;
  for (const [label, value] of rows) {
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(label.padEnd(16, "."), 50, ry);
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(value, 300, ry);
    ry += 40;
  }
  ctx.font = `14px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.highlight;
  ctx.fillText("PRESS ANY KEY TO CONTINUE_", 50, height - 30);
}

// --- Simulation ---
// Move a scan column across all weeks; when it reaches a lit cell's column,
// spawn a "shot" traveling up and a hit/particle burst.
let particles = [];
const hitSet = new Set();
const shots = []; // {x, y, targetY}

const framesPerCol = 3;
const totalScanFrames = numWeeks * framesPerCol;
const shipY = height - 40;

for (let f = 0; f < totalScanFrames; f++) {
  const scanCol = Math.floor(f / framesPerCol);
  const shipX = gridX + Math.min(scanCol, numWeeks - 1) * (cellSize + cellGap) + cellSize / 2;

  // fire at any lit cell in this column at the start of the column's frames
  if (f % framesPerCol === 0) {
    const targets = litCells.filter((c) => c.wi === scanCol);
    for (const t of targets) {
      const ty = gridY + t.di * (cellSize + cellGap) + cellSize / 2;
      shots.push({ x: shipX, y: shipY - 12, targetY: ty, wi: t.wi, di: t.di, speed: 14 });
    }
  }

  drawBg();
  drawGrid(hitSet);

  // advance shots
  for (const s of shots) {
    if (s.y > s.targetY) {
      s.y -= s.speed;
      ctx.strokeStyle = PALETTE.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x, s.y + 8);
      ctx.stroke();
    } else {
      const key = `${s.wi}-${s.di}`;
      if (!hitSet.has(key)) {
        hitSet.add(key);
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 * i) / 8;
          particles.push({
            x: s.x,
            y: s.y,
            vx: Math.cos(angle) * 1.6,
            vy: Math.sin(angle) * 1.6,
            r: 1.6,
            life: 10,
            maxLife: 10,
            color: PALETTE.highlight,
          });
        }
      }
    }
  }

  particles.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 1;
  });
  particles = particles.filter((p) => p.life > 0);
  drawParticles(particles);

  drawShip(shipX, shipY);
  drawHud(scanCol + 1);

  ctx.font = `bold 16px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText("> contrib_scan.exe --live", gridX, 24);

  encoder.addFrame(ctx);
}

for (let i = 0; i < statsHoldFrames; i++) {
  drawStatsCard();
  encoder.addFrame(ctx);
}

encoder.finish();
const buf = encoder.out.getData();
const outPath = path.join(__dirname, "..", "assets", "generated", "shooter.gif");
writeFileSync(outPath, buf);
console.log(`Wrote ${outPath} (${buf.length} bytes)`);
