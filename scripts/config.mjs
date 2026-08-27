// Single source of truth for copy, palette, and tunable sizes.
// Edit this file to change bio text, colors, or animation frame counts.

export const GITHUB_LOGIN = "CodeCreatorManMike";

export const PALETTE = {
  background: "#0D1117",
  panel: "#111820",
  text: "#D6E0E7",
  muted: "#768390",
  accent: "#39FF88", // phosphor green - dominant
  highlight: "#58A6FF", // rare blue highlight
};

export const FONT_FAMILY = "'Consolas', 'Courier New', monospace";

export const BIO = {
  headline: "BSc Artificial Intelligence — Oxford Brookes",
  skillsLine: "Python · PowerShell · Bash · C++ · HTML/CSS",
  focusLine: "Focus: automation, ML systems, root-cause tooling, builder at heart",
  location: "UK",
  status: "ONLINE",
};

// Boot animation (boot.gif)
export const BOOT = {
  text: "CODECREATORMANMIKE",
  // Wide enough to fit the figlet block-letter wordmark for `text` on one
  // unbroken line once settled (see render-boot.mjs — font size is fit
  // dynamically against this width via ctx.measureText, so widening this
  // is the lever to pull if the wordmark ever gets cut off/wrapped).
  width: 1600,
  height: 340,
  fps: 12,
  totalFrames: 72, // ~6s @ 12fps
  glitchFrame: 40,
  readyText: "SYSTEM READY.",
  // figlet font used for the settled/glitch reveal of `text`. "Doom" is a
  // dense, blocky, all-caps-friendly font (built from _ / \ | < >) that
  // renders "CODECREATORMANMIKE" as a single legible line without
  // overlap, matching the chunky figlet-banner reference look.
  figletFont: "Doom",
};

// Contribution arcade shooter (shooter.gif)
export const SHOOTER = {
  width: 900,
  height: 320,
  fps: 10,
  cellSize: 11,
  cellGap: 3,
  statsHoldFrames: 20, // frames to hold on the stats card before looping
};

// Stats diagnostics panel (stats.svg) — kept for backward reference, unused by README now.
export const STATS = {
  width: 900,
  height: 420,
};

// Identity + pinned-projects card (identity.svg)
export const IDENTITY = {
  width: 900,
  height: 360,
};

// Skill progress bars (skills.svg) — fixed, hand-set values.
// Order and values are the source of truth; NOT computed from repo language bytes.
export const SKILLS = {
  width: 900,
  height: 300,
  list: [
    { name: "Python", pct: 40 },
    { name: "C++", pct: 10 },
    { name: "C#", pct: 10 },
    { name: "HTML & CSS", pct: 75 },
    { name: "PowerShell", pct: 100 },
    { name: "Bash", pct: 100 },
  ],
};
