// Standalone sprite-sheet renderer for reviewing the demon pixel art in
// isolation from the grid/animation pipeline (not part of the workflow).
import { writeFile } from "node:fs/promises";
import {
  FRAMES,
  CLUB,
  CLUB_WINDUP_OFFSET,
  CLUB_IMPACT_OFFSET,
  clubImpactBitmap,
  EMBER,
  FLAME,
  FLAME_GLOW,
  PALETTES,
  SPRITE_WIDTH,
  SPRITE_HEIGHT,
  mirrorFrame,
} from "./lib/sprite.mjs";

const UNIT = 12; // large pixel scale for inspection
const PAD = 20;
// Extra room around each frame so the club can overhang above the head
// (windup) or below the feet (impact) without clipping.
const OVERHANG_X = 4;
const OVERHANG_TOP = 8;
const OVERHANG_BOTTOM = 4;

function stamp(rects, bitmap, palette, originX, originY, offsetX = 0, offsetY = 0) {
  for (let row = 0; row < bitmap.length; row++) {
    for (let col = 0; col < bitmap[row].length; col++) {
      const ch = bitmap[row][col];
      if (ch === ".") continue;
      const color = palette[ch];
      if (!color || color === "transparent") continue;
      rects.push(
        `<rect x="${originX + (offsetX + col) * UNIT}" y="${originY + (offsetY + row) * UNIT}" width="${UNIT}" height="${UNIT}" fill="${color}"/>`
      );
    }
  }
}

function drawFrame(frame, palette, club, originX, originY) {
  const rects = [];
  stamp(rects, frame, palette, originX, originY);
  if (club) {
    stamp(rects, club.bitmap, palette, originX, originY, club.offset.x, club.offset.y);
  }
  return rects.join("");
}

function label(text, x, y) {
  return `<text x="${x}" y="${y}" font-family="monospace" font-size="14" fill="#888">${text}</text>`;
}

function mirrorClub(club) {
  const w = club.bitmap[0].length;
  return {
    bitmap: mirrorFrame(club.bitmap),
    offset: { x: SPRITE_WIDTH - club.offset.x - w, y: club.offset.y },
  };
}

function renderSheet(theme) {
  const palette = PALETTES[theme];
  const cellW = (SPRITE_WIDTH + OVERHANG_X * 2) * UNIT + PAD * 2;
  const cellH = (SPRITE_HEIGHT + OVERHANG_TOP + OVERHANG_BOTTOM) * UNIT + PAD * 2 + 24;
  const frameOriginX = (x) => x + PAD + OVERHANG_X * UNIT;
  const frameOriginY = (y) => y + PAD + 24 + OVERHANG_TOP * UNIT;

  const clubWindupR = { bitmap: CLUB, offset: CLUB_WINDUP_OFFSET };
  const clubImpactR = { bitmap: clubImpactBitmap(), offset: CLUB_IMPACT_OFFSET };

  const frames = [
    ["walkA (right)", FRAMES.walkA, null],
    ["walkA (left)", mirrorFrame(FRAMES.walkA), null],
    ["walkB (right)", FRAMES.walkB, null],
    ["walkB (left)", mirrorFrame(FRAMES.walkB), null],
    ["windup (right)", FRAMES.windup, clubWindupR],
    ["windup (left)", mirrorFrame(FRAMES.windup), mirrorClub(clubWindupR)],
    ["impact (right)", FRAMES.impact, clubImpactR],
    ["impact (left)", mirrorFrame(FRAMES.impact), mirrorClub(clubImpactR)],
  ];

  let body = "";
  frames.forEach(([name, frame, club], i) => {
    const ox = (i % 4) * cellW;
    const oy = Math.floor(i / 4) * cellH;
    body += label(name, ox + PAD, oy + 18);
    body += drawFrame(frame, palette, club, frameOriginX(ox), frameOriginY(oy));
  });

  const miniRowY = 2 * cellH;
  body += label("ember", PAD, miniRowY + 18);
  body += drawFrame(EMBER, palette, null, PAD, miniRowY + PAD + 24);
  body += label("flame", PAD + cellW, miniRowY + 18);
  body += drawFrame(FLAME, palette, null, PAD + cellW, miniRowY + PAD + 24);
  body += label("flame + glow", PAD + cellW * 2, miniRowY + 18);
  body += drawFrame(FLAME, palette, null, PAD + cellW * 2, miniRowY + PAD + 24);
  body += drawFrame(FLAME_GLOW, palette, null, PAD + cellW * 2, miniRowY + PAD + 24);

  const width = cellW * 4;
  const height = miniRowY + cellH;
  const bg = theme === "dark" ? "#0d1117" : "#ffffff";

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
    `<rect x="0" y="0" width="${width}" height="${height}" fill="${bg}"/>` +
    body +
    `</svg>`
  );
}

async function main() {
  await writeFile("scripts/_demon-sprite-sheet-light.svg", renderSheet("light"));
  await writeFile("scripts/_demon-sprite-sheet-dark.svg", renderSheet("dark"));
  console.log("Wrote scripts/_demon-sprite-sheet-light.svg and -dark.svg");
}

main();
