// Renders assets/generated/profile.gif: ONE single animated GIF combining,
// top to bottom, on one continuous #0D1117 canvas with a single outer
// rounded border (no per-zone boxes):
//   1. the boot wordmark scene (fade/hold/flash loop, ported from
//      render-boot.mjs, scaled to the shared canvas width)
//   2. the contribution arcade shooter scene (scan/fire/explosion/reset
//      loop, ported from render-shooter.mjs)
//   3. the static whoami / ps --projects / skills --progress content
//      (ported from render-identity.mjs / render-skills.mjs layout math,
//      drawn identically on every frame via direct canvas calls — no SVG
//      rasterization, since node-canvas prebuilt binaries are not
//      guaranteed to be compiled with librsvg support)
//
// Thin horizontal rules separate the zones (matching the existing
// internal-divider style already used inside panel.svg) but there is only
// ONE outer border around the whole canvas.
import { createCanvas } from "canvas";
import GIFEncoder from "gif-encoder-2";
import figlet from "figlet";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PALETTE, FONT_FAMILY, BOOT, SHOOTER, BIO, GITHUB_LOGIN, SKILLS } from "./config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, "..", "data.json");
const data = JSON.parse(readFileSync(dataPath, "utf8"));

const FPS = 10;
const WIDTH = SHOOTER.width; // 900 — shared canvas width for every zone

// ---------------------------------------------------------------------------
// Zone A: boot wordmark (ported from render-boot.mjs, refit to WIDTH)
// ---------------------------------------------------------------------------
const BOOT_ZONE_HEIGHT = 200;
const BOOT_TOTAL_FRAMES = BOOT.totalFrames; // 48 — loops within the shared timeline

const rawFigletLines = figlet
  .textSync(BOOT.text, { font: BOOT.figletFont, horizontalLayout: "fitted" })
  .split("\n");
let figletStart = 0;
let figletEnd = rawFigletLines.length;
while (figletStart < figletEnd && rawFigletLines[figletStart].trim() === "") figletStart++;
while (figletEnd > figletStart && rawFigletLines[figletEnd - 1].trim() === "") figletEnd--;
const figletLines = rawFigletLines.slice(figletStart, figletEnd);

const FIGLET_MARGIN_X = 14;
const FIGLET_MAX_WIDTH = WIDTH - FIGLET_MARGIN_X * 2;
const FIGLET_MAX_HEIGHT = BOOT_ZONE_HEIGHT - 60; // leave room for status line

// measured with a throwaway canvas context (font metrics don't depend on size)
const measureCanvas = createCanvas(WIDTH, BOOT_ZONE_HEIGHT);
const measureCtx = measureCanvas.getContext("2d");

function fitFigletFontSize() {
  measureCtx.textBaseline = "top";
  for (let size = 40; size >= 1; size -= 0.25) {
    measureCtx.font = `${size}px ${FONT_FAMILY}`;
    const widest = Math.max(...figletLines.map((l) => measureCtx.measureText(l).width));
    const lineHeight = size * 1.05;
    const blockHeight = lineHeight * figletLines.length;
    if (widest <= FIGLET_MAX_WIDTH && blockHeight <= FIGLET_MAX_HEIGHT) {
      return { size, lineHeight, blockHeight };
    }
  }
  return { size: 1, lineHeight: 1 * 1.05, blockHeight: FIGLET_MAX_HEIGHT };
}

const { size: figletFontSize, lineHeight: figletLineHeight, blockHeight: figletBlockHeight } =
  fitFigletFontSize();

const CORE_BRIGHT = "#EAFFF4";

// File-size discipline: lower shadowBlur radii than the standalone boot.gif
// (which produced an 18MB file) — the glow is cheaper per frame and the
// combined GIF has ~3.5x more frames overall.
function drawFigletWordmark(ctx, yOffset, alpha, glowStrength, coreColor) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textBaseline = "top";
  ctx.textAlign = "center";
  ctx.font = `${figletFontSize}px ${FONT_FAMILY}`;
  const startY = yOffset + (BOOT_ZONE_HEIGHT - 50 - figletBlockHeight) / 2 + 6;

  ctx.shadowColor = PALETTE.accent;
  ctx.shadowBlur = 10 * glowStrength;
  ctx.fillStyle = PALETTE.accent;
  figletLines.forEach((line, i) => {
    ctx.fillText(line, WIDTH / 2, startY + i * figletLineHeight);
  });
  if (glowStrength > 1) {
    ctx.shadowBlur = 16 * (glowStrength - 1) + 10;
    figletLines.forEach((line, i) => {
      ctx.fillText(line, WIDTH / 2, startY + i * figletLineHeight);
    });
  }

  ctx.shadowBlur = 0;
  ctx.fillStyle = coreColor;
  figletLines.forEach((line, i) => {
    ctx.fillText(line, WIDTH / 2, startY + i * figletLineHeight);
  });

  ctx.restore();
  ctx.textAlign = "left";
}

const FADE_IN_FRAMES = Math.round(BOOT_TOTAL_FRAMES * 0.22);
const HOLD1_FRAMES = Math.round(BOOT_TOTAL_FRAMES * 0.22);
const PULSE_FRAMES = Math.round(BOOT_TOTAL_FRAMES * 0.32);

function drawBootZone(ctx, yOffset, frameIdx) {
  const bootFrame = frameIdx % BOOT_TOTAL_FRAMES;

  let alpha = 1;
  let glowStrength = 1;
  let coreColor = CORE_BRIGHT;

  if (bootFrame < FADE_IN_FRAMES) {
    alpha = (bootFrame + 1) / FADE_IN_FRAMES;
    glowStrength = 0.6 + 0.4 * alpha;
  } else if (bootFrame < FADE_IN_FRAMES + HOLD1_FRAMES) {
    alpha = 1;
    glowStrength = 1;
  } else if (bootFrame < FADE_IN_FRAMES + HOLD1_FRAMES + PULSE_FRAMES) {
    const t = bootFrame - (FADE_IN_FRAMES + HOLD1_FRAMES);
    const cyclePos = t % 4;
    if (cyclePos === 0) {
      alpha = 1;
      glowStrength = 1.6;
      coreColor = "#FFFFFF";
    } else if (cyclePos === 1) {
      alpha = 0.72;
      glowStrength = 0.7;
    } else {
      alpha = 1;
      glowStrength = 1.05;
    }
  } else {
    alpha = 1;
    glowStrength = 1;
  }

  drawFigletWordmark(ctx, yOffset, alpha, glowStrength, coreColor);

  ctx.font = `15px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.highlight;
  ctx.fillText(BOOT.readyText, 28, yOffset + BOOT_ZONE_HEIGHT - 34);
  if (bootFrame % 6 < 3) {
    const w = ctx.measureText(BOOT.readyText).width;
    ctx.fillStyle = PALETTE.accent;
    ctx.fillRect(28 + w + 8, yOffset + BOOT_ZONE_HEIGHT - 46, 9, 15);
  }

  ctx.font = `11px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(
    `root@github:~$ boot.sh  [${bootFrame + 1}/${BOOT_TOTAL_FRAMES}]`,
    28,
    yOffset + BOOT_ZONE_HEIGHT - 14
  );
}

// ---------------------------------------------------------------------------
// Zone B: contribution arcade shooter (ported from render-shooter.mjs)
// ---------------------------------------------------------------------------
const SHOOTER_ZONE_HEIGHT = SHOOTER.height; // 320
const { cellSize, cellGap, statsHoldFrames } = SHOOTER;

const weeks = data.weeks;
const numWeeks = weeks.length;
const gridW = numWeeks * (cellSize + cellGap);
const gridH = 7 * (cellSize + cellGap);
const gridX = Math.round((WIDTH - gridW) / 2);
const gridYBase = 36;

function intensityColor(count) {
  if (count === 0) return "#1b2530";
  if (count < 3) return "#1c6b4a";
  if (count < 6) return "#22a066";
  if (count < 10) return "#2ed57f";
  return PALETTE.accent;
}

const litCells = [];
weeks.forEach((w, wi) => {
  w.days.forEach((d, di) => {
    if (d.count > 0) litCells.push({ wi, di, count: d.count });
  });
});

// A combined GIF pays for every frame across the FULL tall canvas (boot +
// shooter + static identity/skills content all baked into each frame), so
// this uses a coarser scan cadence than the standalone shooter.gif
// (framesPerCol: 3) to keep the total frame count — and therefore file
// size — down while still reading as a smooth scan/fire animation.
const framesPerCol = 2;
const totalScanFrames = numWeeks * framesPerCol;
const SHOOTER_TOTAL_FRAMES = totalScanFrames + statsHoldFrames;

// Precompute the full shooter simulation once (particles/shots/hits are
// stateful across frames), then replay it frame-by-frame during rendering.
function simulateShooter() {
  let particles = [];
  const hitSet = new Set();
  const shots = [];
  const frames = [];

  for (let f = 0; f < totalScanFrames; f++) {
    const scanCol = Math.floor(f / framesPerCol);
    const shipX = gridX + Math.min(scanCol, numWeeks - 1) * (cellSize + cellGap) + cellSize / 2;

    if (f % framesPerCol === 0) {
      const targets = litCells.filter((c) => c.wi === scanCol);
      for (const t of targets) {
        const ty = gridYBase + t.di * (cellSize + cellGap) + cellSize / 2;
        shots.push({ x: shipX, y: SHOOTER_ZONE_HEIGHT - 52, targetY: ty, wi: t.wi, di: t.di, speed: 14 });
      }
    }

    const shotSnapshots = [];
    for (const s of shots) {
      if (s.y > s.targetY) {
        s.y -= s.speed;
        shotSnapshots.push({ x: s.x, y: s.y, done: false });
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
        shotSnapshots.push({ x: s.x, y: s.y, done: true });
      }
    }

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1;
    });
    particles = particles.filter((p) => p.life > 0);

    frames.push({
      scanCol,
      shipX,
      hitSet: new Set(hitSet),
      shots: shotSnapshots,
      particles: particles.map((p) => ({ ...p })),
    });
  }

  return frames;
}

const shooterFrames = simulateShooter();

function drawShooterGrid(ctx, yOffset, hitSet) {
  for (let wi = 0; wi < numWeeks; wi++) {
    const days = weeks[wi].days;
    for (let di = 0; di < days.length; di++) {
      const d = days[di];
      const x = gridX + wi * (cellSize + cellGap);
      const y = yOffset + gridYBase + di * (cellSize + cellGap);
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

function drawShip(ctx, cx, y) {
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

function drawShooterHud(ctx, yOffset, scanCol) {
  ctx.font = `12px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(`SCAN COL ${Math.min(scanCol, numWeeks)}/${numWeeks}`, gridX, yOffset + gridYBase + gridH + 26);
  ctx.fillStyle = PALETTE.highlight;
  ctx.fillText(`TARGETS ${litCells.length}`, gridX + gridW - 130, yOffset + gridYBase + gridH + 26);
}

function drawStatsCard(ctx, yOffset) {
  ctx.textBaseline = "middle";
  ctx.font = `bold 22px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.accent;
  ctx.fillText("> MISSION REPORT", 40, yOffset + 46);

  const rows = [
    ["CONTRIBUTIONS", data.totalContributions.toLocaleString()],
    ["CURRENT STREAK", `${data.currentStreak}d`],
    ["PUBLIC REPOS", String(data.publicRepos)],
    ["FOLLOWERS", String(data.followers)],
  ];
  ctx.font = `17px ${FONT_FAMILY}`;
  let ry = yOffset + 94;
  for (const [label, value] of rows) {
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(label.padEnd(16, "."), 40, ry);
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(value, 280, ry);
    ry += 36;
  }
  ctx.font = `13px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.highlight;
  ctx.fillText("PRESS ANY KEY TO CONTINUE_", 40, yOffset + SHOOTER_ZONE_HEIGHT - 26);
  ctx.textBaseline = "alphabetic";
}

function drawShooterZone(ctx, yOffset, frameIdx) {
  const shooterFrame = frameIdx % SHOOTER_TOTAL_FRAMES;

  if (shooterFrame >= totalScanFrames) {
    drawStatsCard(ctx, yOffset);
    return;
  }

  const fr = shooterFrames[shooterFrame];
  drawShooterGrid(ctx, yOffset, fr.hitSet);

  ctx.strokeStyle = PALETTE.accent;
  ctx.lineWidth = 2;
  for (const s of fr.shots) {
    if (!s.done) {
      ctx.beginPath();
      ctx.moveTo(s.x, yOffset + s.y);
      ctx.lineTo(s.x, yOffset + s.y + 8);
      ctx.stroke();
    }
  }

  for (const p of fr.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, yOffset + p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  drawShip(ctx, fr.shipX, yOffset + SHOOTER_ZONE_HEIGHT - 52);
  drawShooterHud(ctx, yOffset, fr.scanCol + 1);

  ctx.font = `bold 15px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText("> contrib_scan.exe --live", gridX, yOffset + 22);
}

// ---------------------------------------------------------------------------
// Zone C: static whoami / ps --projects / skills --progress content
// (ported layout math from render-identity.mjs + render-skills.mjs, drawn
// with direct canvas calls since this zone never animates)
// ---------------------------------------------------------------------------
const MARGIN = 28;

function dotLeader(label, fieldChars) {
  const dots = Math.max(3, fieldChars - label.length - 1);
  return `${label} ${".".repeat(dots)}`;
}

const pinned = data.pinned || [];
const statusFor = (repo) => (repo.archived ? "ARCHIVED" : "RUNNING");

// --- vertical rhythm (identical spacing constants to render-identity.mjs) ---
const stampLineH = 40;
const headerY = 30;
const underlineY = headerY + 10;
const contentTopGap = 28;
const skillsLineY = underlineY + contentTopGap;
const headlineY = skillsLineY + 22;
const focusLineY = headlineY + 20;
const metaRowY = focusLineY + 30;
const sectionDivY = metaRowY + 28;

const header2Y = sectionDivY + 28;
const underline2Y = header2Y + 10;
const tableHeaderY = underline2Y + 24;
const tableRuleY = tableHeaderY + 10;
const rowStart = tableRuleY + 24;
const projectRowH = 28;

const lastRowY = rowStart + Math.max(0, pinned.length - 1) * projectRowH;
const identityContentHeight = lastRowY + 46;

const skillsHeaderY = 30;
const skillsUnderlineY = skillsHeaderY + 10;
const barTop = skillsUnderlineY + 28;
const barX = MARGIN + 150;
const barH = 16;
const barGap = 20;
const barMaxW = WIDTH - MARGIN - barX - 60;
const skillsContentHeight = barTop + SKILLS.list.length * (barH + barGap) + 34;

const closingLineH = 40;

const IDENTITY_ZONE_HEIGHT = stampLineH + identityContentHeight + skillsContentHeight + closingLineH;

function drawIdentityZone(ctx, yOffset) {
  const Y = (v) => yOffset + v;

  // stamp line
  ctx.font = `12px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(
    `Last synced: ${data.generatedAt} - ${data.totalContributions} contributions - ${data.publicRepos} public repos`,
    MARGIN,
    Y(26)
  );

  const identityTop = stampLineH;
  const IY = (v) => Y(identityTop + v);

  // whoami
  ctx.font = `bold 15px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.accent;
  ctx.fillText("> whoami", MARGIN, IY(headerY));
  ctx.strokeStyle = PALETTE.muted;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.moveTo(MARGIN, IY(underlineY));
  ctx.lineTo(WIDTH - MARGIN, IY(underlineY));
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.font = `bold 16px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(BIO.skillsLine, MARGIN, IY(skillsLineY));

  ctx.font = `13px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.highlight;
  ctx.fillText(BIO.headline, MARGIN, IY(headlineY));

  ctx.font = `12px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(BIO.focusLine, MARGIN, IY(focusLineY));

  ctx.font = `12px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(dotLeader("LOCATION", 16), MARGIN, IY(metaRowY));
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(BIO.location, MARGIN + 150, IY(metaRowY));
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(dotLeader("STATUS", 14), MARGIN + 280, IY(metaRowY));
  ctx.fillStyle = PALETTE.accent;
  ctx.fillText(BIO.status, MARGIN + 390, IY(metaRowY));

  ctx.strokeStyle = PALETTE.muted;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.moveTo(MARGIN, IY(sectionDivY));
  ctx.lineTo(WIDTH - MARGIN, IY(sectionDivY));
  ctx.stroke();
  ctx.globalAlpha = 1;

  // ps --projects
  ctx.font = `bold 15px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.accent;
  ctx.fillText("> ps --projects", MARGIN, IY(header2Y));
  ctx.strokeStyle = PALETTE.muted;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.moveTo(MARGIN, IY(underline2Y));
  ctx.lineTo(WIDTH - MARGIN, IY(underline2Y));
  ctx.stroke();
  ctx.globalAlpha = 1;

  const colPid = MARGIN;
  const colName = MARGIN + 70;
  const colType = MARGIN + 370;
  const colStatus = MARGIN + 500;

  ctx.font = `10px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText("PID", colPid, IY(tableHeaderY));
  ctx.fillText("PROJECT", colName, IY(tableHeaderY));
  ctx.fillText("TYPE", colType, IY(tableHeaderY));
  ctx.fillText("STATUS", colStatus, IY(tableHeaderY));

  ctx.strokeStyle = PALETTE.muted;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.moveTo(MARGIN, IY(tableRuleY));
  ctx.lineTo(WIDTH - MARGIN, IY(tableRuleY));
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.font = `12px ${FONT_FAMILY}`;
  pinned.forEach((repo, i) => {
    const y = IY(rowStart + i * projectRowH);
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(String(1000 + i), colPid, y);
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(repo.name, colName, y);
    ctx.fillStyle = PALETTE.highlight;
    ctx.fillText(repo.language || "-", colType, y);
    const status = statusFor(repo);
    ctx.fillStyle = status === "RUNNING" ? PALETTE.accent : PALETTE.muted;
    ctx.fillText(status, colStatus, y);
  });

  ctx.font = `10px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(
    `generated ${data.generatedAt} - source: github graphql api`,
    MARGIN,
    IY(identityContentHeight - 14)
  );

  // skills --progress
  const skillsTop = identityTop + identityContentHeight;
  const SY = (v) => Y(skillsTop + v);

  ctx.font = `bold 15px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.accent;
  ctx.fillText("> skills --progress", MARGIN, SY(skillsHeaderY));
  ctx.strokeStyle = PALETTE.muted;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.moveTo(MARGIN, SY(skillsUnderlineY));
  ctx.lineTo(WIDTH - MARGIN, SY(skillsUnderlineY));
  ctx.stroke();
  ctx.globalAlpha = 1;

  SKILLS.list.forEach((s, i) => {
    const y = SY(barTop + i * (barH + barGap));
    ctx.font = `13px ${FONT_FAMILY}`;
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(s.name, MARGIN, y + barH - 3);

    ctx.fillStyle = "#1c2530";
    ctx.strokeStyle = PALETTE.muted;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(barX, y, barMaxW, barH);
    ctx.strokeRect(barX, y, barMaxW, barH);
    ctx.globalAlpha = 1;

    const w = Math.max(2, (s.pct / 100) * barMaxW);
    ctx.globalAlpha = 0.45 + 0.55 * (s.pct / 100);
    ctx.fillStyle = PALETTE.accent;
    ctx.fillRect(barX, y, w, barH);
    ctx.globalAlpha = 1;

    ctx.font = `12px ${FONT_FAMILY}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(`${s.pct}%`, barX + barMaxW + 10, y + barH - 3);
  });

  ctx.font = `10px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(
    "learning progress - hand-tracked, updated manually in scripts/config.mjs",
    MARGIN,
    SY(skillsContentHeight - 12)
  );

  // closing line
  const closingTop = skillsTop + skillsContentHeight;
  ctx.font = `bold 13px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.accent;
  ctx.fillText(`SESSION ACTIVE - ${GITHUB_LOGIN.toUpperCase()}`, MARGIN, Y(closingTop + 24));
}

// ---------------------------------------------------------------------------
// Combined canvas + timeline
// ---------------------------------------------------------------------------
const BOOT_Y = 0;
const DIVIDER1_Y = BOOT_ZONE_HEIGHT;
const SHOOTER_Y = BOOT_ZONE_HEIGHT + 6;
const DIVIDER2_Y = SHOOTER_Y + SHOOTER_ZONE_HEIGHT;
const IDENTITY_Y = DIVIDER2_Y + 6;
const TOTAL_HEIGHT = IDENTITY_Y + IDENTITY_ZONE_HEIGHT + 8;

const TOTAL_FRAMES = SHOOTER_TOTAL_FRAMES; // the longer-running loop drives the timeline

const canvas = createCanvas(WIDTH, TOTAL_HEIGHT);
const ctx = canvas.getContext("2d");

const encoder = new GIFEncoder(WIDTH, TOTAL_HEIGHT, "neuquant", true);
encoder.start();
encoder.setRepeat(0);
encoder.setDelay(Math.round(1000 / FPS));
encoder.setQuality(10); // matches the quality used by the other render scripts

function drawDivider(y) {
  ctx.strokeStyle = PALETTE.muted;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(12, y);
  ctx.lineTo(WIDTH - 12, y);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawFrame(frameIdx) {
  // one continuous background
  ctx.fillStyle = PALETTE.background;
  ctx.fillRect(0, 0, WIDTH, TOTAL_HEIGHT);

  drawBootZone(ctx, BOOT_Y, frameIdx);
  drawDivider(DIVIDER1_Y);
  drawShooterZone(ctx, SHOOTER_Y, frameIdx);
  drawDivider(DIVIDER2_Y);
  drawIdentityZone(ctx, IDENTITY_Y);

  // ONE outer rounded border around the entire canvas — no per-zone boxes.
  const r = 10;
  const x = 4;
  const y = 4;
  const w = WIDTH - 8;
  const h = TOTAL_HEIGHT - 8;
  ctx.strokeStyle = PALETTE.muted;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.stroke();
}

for (let f = 0; f < TOTAL_FRAMES; f++) {
  drawFrame(f);
  encoder.addFrame(ctx);
}

encoder.finish();
const buf = encoder.out.getData();
const outPath = path.join(__dirname, "..", "assets", "generated", "profile.gif");
writeFileSync(outPath, buf);
console.log(
  `Wrote ${outPath} (${buf.length} bytes, ${WIDTH}x${TOTAL_HEIGHT}, ${TOTAL_FRAMES} frames @ ${FPS}fps)`
);
