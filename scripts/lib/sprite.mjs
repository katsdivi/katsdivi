// Hand-authored pixel-art frames for the demon sprite, an ember trail
// particle, and a "smashed cell" crack overlay. Each frame is an array of
// equal-length strings; each character is a palette key resolved to a
// color per theme in PALETTES below. '.' is transparent.

export const SPRITE_WIDTH = 9;
export const SPRITE_HEIGHT = 12;

// facing-right frames; facing-left is produced by mirroring each row.
export const FRAMES = {
  walkA: [
    "..hh.hh..",
    ".hoooooh.",
    ".obBBBbo.",
    ".obebebo.",
    ".obBBBbo.",
    "..oooo...",
    ".ccbBbcc.",
    "ccbBBbcc.",
    ".ccbBbcc.",
    "...o.o...",
    "..o...o..",
    ".o.....o.",
  ],
  walkB: [
    "..hh.hh..",
    ".hoooooh.",
    ".obBBBbo.",
    ".obebebo.",
    ".obBBBbo.",
    "..oooo...",
    ".ccbBbcc.",
    "ccbBBbcc.",
    ".ccbBbcc.",
    "...o.o...",
    "...o.o...",
    "..o...o..",
  ],
  // Arm cocked back and up, weight shifting onto the back foot - the
  // anticipation beat before the strike.
  windup: [
    "..hh.hh..",
    ".hoooooh.",
    ".obBBBbo.",
    ".obebebo.",
    ".obBBBbo.",
    "..oooo..w",
    ".ccbBbc.w",
    "ccbBBbco.",
    ".ccbBbcc.",
    "..o...o..",
    ".o......o",
    "o.......o",
  ],
  // Body hunched forward into the strike, arm driven down toward the
  // ground - lands on the same tick the club connects.
  impact: [
    "..hh.hh..",
    ".hoooooh.",
    ".obBBBbo.",
    ".obebebo.",
    ".obBBBbo.",
    "..oooo...",
    ".ccbBbcc.",
    "ccbBBbcc.",
    ".ccbBbco.",
    "..o...ow.",
    ".o.....ow",
    "o.......o",
  ],
};

// A stubby, top-heavy club: knobbed/studded head tapering to a wrapped
// grip and short wooden handle. Drawn head-up; impact uses it flipped
// head-down so it reads as driving into the ground.
export const CLUB = [".kkk.", "kkkkk", "kkkkk", "..g..", "..g..", "..w..", "..w.."];

// Offsets are relative to the sprite's own 9x12 grid, in sprite pixel
// units - negative/beyond-width values are intentional, letting the
// club overhang above the head (windup) or below the feet (impact).
export const CLUB_WINDUP_OFFSET = { x: 6, y: -6 };
export const CLUB_IMPACT_OFFSET = { x: 5, y: 8 };

export function clubImpactBitmap() {
  return CLUB.slice().reverse();
}

export const EMBER = [".e.", "eEe", ".e."];

// Blazing hit-mark left behind on smashed cells: a small flame silhouette.
export const FLAME = [
  "..f..",
  ".fFf.",
  ".fFf.",
  "fFFFf",
  ".fff.",
];

// Just the hottest core pixels of FLAME, rendered in a brighter color and
// pulsed on top of the base flame for a flicker effect.
export const FLAME_GLOW = [
  ".....",
  "..W..",
  "..W..",
  ".WWW.",
  ".....",
];

export const PALETTES = {
  light: {
    ".": "transparent",
    o: "#1b0f24",
    b: "#5b21b6",
    B: "#8b5cf6",
    c: "#3b1550",
    t: "#6d2b7a",
    e: "#f43f5e",
    h: "#e7e2d6",
    w: "#8a5a34",
    g: "#4b3220",
    k: "#57534e",
    E: "#fbbf24",
    f: "#f97316",
    F: "#fbbf24",
    W: "#fef9c3",
  },
  dark: {
    ".": "transparent",
    o: "#0d0612",
    b: "#7c3aed",
    B: "#a78bfa",
    c: "#4c1d6b",
    t: "#7e3a8f",
    e: "#fb7185",
    h: "#f1efe9",
    w: "#a3703f",
    g: "#5c3d27",
    k: "#78716c",
    E: "#fcd34d",
    f: "#fb923c",
    F: "#fcd34d",
    W: "#fffbeb",
  },
};

function mirrorRow(row) {
  return row.split("").reverse().join("");
}

export function mirrorFrame(frame) {
  return frame.map(mirrorRow);
}

function assertRect(name, frame, width) {
  for (const [i, row] of frame.entries()) {
    if (row.length !== width) {
      throw new Error(`sprite frame "${name}" row ${i} has length ${row.length}, expected ${width}`);
    }
  }
}

// Fail fast at import time if any hand-authored frame is malformed.
for (const [name, frame] of Object.entries(FRAMES)) {
  assertRect(name, frame, SPRITE_WIDTH);
  if (frame.length !== SPRITE_HEIGHT) {
    throw new Error(`sprite frame "${name}" has ${frame.length} rows, expected ${SPRITE_HEIGHT}`);
  }
}
assertRect("club", CLUB, 5);
assertRect("ember", EMBER, 3);
assertRect("flame", FLAME, 5);
assertRect("flameGlow", FLAME_GLOW, 5);
