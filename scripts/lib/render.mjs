import { buildWanderPath } from "./path.mjs";
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
} from "./sprite.mjs";

const CELL = 10;
const GAP = 3;
const PITCH = CELL + GAP;
const PIXEL_UNIT = 1.6;

const SPRITE_PX_W = SPRITE_WIDTH * PIXEL_UNIT;
const SPRITE_PX_H = SPRITE_HEIGHT * PIXEL_UNIT;

const MARGIN_X = 16;
const MARGIN_Y = 16 + Math.ceil((SPRITE_PX_H - CELL) / 2);

const WALK_DT = 0.05;
const WINDUP_DT = 0.08;
const IMPACT_DT = 0.06;
const EMBER_FADE = 0.6;

// How long (seconds) a flame mark takes to cool from a fresh blaze down
// to its resting ember floor - marks further back along the path have
// had more time to cool, so the trail dims with distance/age.
const FLAME_COOL_DURATION = 4;
// Resting brightness once fully cooled. Dark mode cools much further
// (fresh hits stand out sharply against the dark background); light
// mode keeps a higher floor since a near-invisible mark on a light
// background just looks broken.
const FLAME_FLOOR = { light: 0.55, dark: 0.18 };

const LEVEL_COLORS = {
  light: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
  dark: ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"],
};

const SMASHED_COLOR = { light: "#4a3226", dark: "#2b1a10" };

// Builds an opacity keyframe timeline (as fractions of the loop, 0-1)
// for a flame mark ignited at tsFrac: invisible until ignition, an
// almost-instant rise to full blaze, then a decay curve down to floor
// over FLAME_COOL_DURATION seconds, held at floor until the loop wraps.
function buildBlazeTimeline(tsFrac, total, floor) {
  const coolFrac = FLAME_COOL_DURATION / total;
  const pts = [[0, 0]];
  const riseFrac = Math.max(0, tsFrac - 0.002);
  if (riseFrac > 0) pts.push([riseFrac, 0]);
  pts.push([tsFrac, 1]);

  for (const [frac, val] of [
    [0.2, 0.72],
    [0.5, 0.42],
    [1, floor],
  ]) {
    let t = Math.min(tsFrac + coolFrac * frac, 0.999999);
    const prev = pts[pts.length - 1][0];
    if (t <= prev) t = Math.min(prev + 0.000001, 0.9999999);
    pts.push([t, val]);
  }

  if (pts[pts.length - 1][0] < 1) {
    pts.push([1, floor]);
  } else {
    pts[pts.length - 1] = [1, floor];
  }

  return {
    keyTimes: pts.map((p) => p[0].toFixed(6)).join(";"),
    values: pts.map((p) => p[1]).join(";"),
  };
}

function cellOrigin(x, y) {
  return { px: MARGIN_X + x * PITCH, py: MARGIN_Y + y * PITCH };
}

function stampBitmap(rects, bitmap, palette, offsetX, offsetY) {
  for (let row = 0; row < bitmap.length; row++) {
    for (let col = 0; col < bitmap[row].length; col++) {
      const ch = bitmap[row][col];
      if (ch === ".") continue;
      const color = palette[ch];
      if (!color || color === "transparent") continue;
      const x = (offsetX + col) * PIXEL_UNIT;
      const y = (offsetY + row) * PIXEL_UNIT;
      rects.push(
        `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${PIXEL_UNIT.toFixed(2)}" height="${PIXEL_UNIT.toFixed(2)}" fill="${color}"/>`
      );
    }
  }
}

function spriteFrameGroup(id, frame, palette, club) {
  const rects = [];
  stampBitmap(rects, frame, palette, 0, 0);
  if (club) {
    stampBitmap(rects, club.bitmap, palette, club.offset.x, club.offset.y);
  }
  return `<g id="${id}">${rects.join("")}</g>`;
}

function miniSymbol(id, frame, colorKey, palette) {
  const unit = PIXEL_UNIT;
  const rects = [];
  for (let row = 0; row < frame.length; row++) {
    for (let col = 0; col < frame[row].length; col++) {
      const ch = frame[row][col];
      if (ch === ".") continue;
      const color = palette[ch] ?? colorKey;
      rects.push(
        `<rect x="${(col * unit).toFixed(2)}" y="${(row * unit).toFixed(2)}" width="${unit.toFixed(2)}" height="${unit.toFixed(2)}" fill="${color}"/>`
      );
    }
  }
  return `<g id="${id}">${rects.join("")}</g>`;
}

// Expands the raw grid-step path into a render timeline: one entry per
// visual tick, inserting an extra held "swing" tick at each cell that
// gets smashed so the strike reads as a distinct beat, not a drive-by.
function buildTimeline(steps, smashAt) {
  const ticks = [];
  const smashTickIndices = [];

  steps.forEach((step, i) => {
    ticks.push({
      x: step.x,
      y: step.y,
      facing: step.dir,
      sprite: i % 2 === 0 ? "walkA" : "walkB",
      dt: WALK_DT,
    });
    if (smashAt.has(i)) {
      ticks.push({
        x: step.x,
        y: step.y,
        facing: step.dir,
        sprite: "windup",
        dt: WINDUP_DT,
      });
      ticks.push({
        x: step.x,
        y: step.y,
        facing: step.dir,
        sprite: "impact",
        dt: IMPACT_DT,
      });
      smashTickIndices.push(ticks.length - 1);
    }
  });

  let t = 0;
  const times = ticks.map((tick) => {
    const start = t;
    t += tick.dt;
    return start;
  });
  const total = t;

  return { ticks, times, total, smashTickIndices };
}

export function renderSVG(grid, theme = "light") {
  const palette = PALETTES[theme];
  const levelColors = LEVEL_COLORS[theme];
  const smashedColor = SMASHED_COLOR[theme];

  const weeks = grid.length;
  const days = weeks > 0 ? grid[0].length : 7;

  const width = MARGIN_X * 2 + weeks * PITCH - GAP;
  const height = MARGIN_Y * 2 + days * PITCH - GAP;

  const { steps, smashAt } = buildWanderPath(grid);
  const { ticks, times, total, smashTickIndices } = buildTimeline(steps, smashAt);
  const keyTimes = times.map((t) => (t / total).toFixed(6)).join(";") + ";1";

  function mirrorClub(club) {
    const w = club.bitmap[0].length;
    return {
      bitmap: mirrorFrame(club.bitmap),
      offset: { x: SPRITE_WIDTH - club.offset.x - w, y: club.offset.y },
    };
  }

  const clubWindupR = { bitmap: CLUB, offset: CLUB_WINDUP_OFFSET };
  const clubImpactR = { bitmap: clubImpactBitmap(), offset: CLUB_IMPACT_OFFSET };
  const clubWindupL = mirrorClub(clubWindupR);
  const clubImpactL = mirrorClub(clubImpactR);

  // --- defs: sprite frames + ember + crack ---
  const defs = [
    spriteFrameGroup("f-walkA-r", FRAMES.walkA, palette, null),
    spriteFrameGroup("f-walkA-l", mirrorFrame(FRAMES.walkA), palette, null),
    spriteFrameGroup("f-walkB-r", FRAMES.walkB, palette, null),
    spriteFrameGroup("f-walkB-l", mirrorFrame(FRAMES.walkB), palette, null),
    spriteFrameGroup("f-windup-r", FRAMES.windup, palette, clubWindupR),
    spriteFrameGroup("f-windup-l", mirrorFrame(FRAMES.windup), palette, clubWindupL),
    spriteFrameGroup("f-impact-r", FRAMES.impact, palette, clubImpactR),
    spriteFrameGroup("f-impact-l", mirrorFrame(FRAMES.impact), palette, clubImpactL),
    miniSymbol("f-ember", EMBER, palette.E, palette),
    miniSymbol("f-flame", FLAME, palette.f, palette),
    miniSymbol("f-flame-glow", FLAME_GLOW, palette.W, palette),
  ].join("");

  // Map each smash tick to its cell so the base rect can animate its own
  // fill (rather than layering a second one-shot rect on top).
  const smashByCell = new Map();
  for (const idx of smashTickIndices) {
    const tick = ticks[idx];
    smashByCell.set(`${tick.x},${tick.y}`, times[idx]);
  }

  // --- grid cells: unsmashed cells are static; smashed cells loop
  // level-color -> smashed-color in sync with the shared timeline, so
  // every loop restart finds the grid intact again, like the original
  // snake's dots. ---
  const cellRects = [];
  const flameUses = [];
  for (let x = 0; x < weeks; x++) {
    for (let y = 0; y < days; y++) {
      const cell = grid[x][y];
      const { px, py } = cellOrigin(x, y);
      const baseColor = levelColors[cell.level] ?? levelColors[0];
      const smashTime = smashByCell.get(`${x},${y}`);

      if (smashTime === undefined) {
        cellRects.push(
          `<rect x="${px}" y="${py}" width="${CELL}" height="${CELL}" rx="2" fill="${baseColor}"/>`
        );
        continue;
      }

      const tsFrac = smashTime / total;
      const ts = tsFrac.toFixed(6);
      cellRects.push(
        `<rect x="${px}" y="${py}" width="${CELL}" height="${CELL}" rx="2" fill="${baseColor}">` +
          `<animate attributeName="fill" calcMode="discrete" keyTimes="0;${ts};1" values="${baseColor};${smashedColor};${smashedColor}" dur="${total.toFixed(3)}s" repeatCount="indefinite"/>` +
          `</rect>`
      );

      const cx = px + CELL / 2 - (5 * PIXEL_UNIT) / 2;
      const cy = py + CELL / 2 - (5 * PIXEL_UNIT) / 2;
      // Outer <g> ignites at tsFrac then cools toward the floor over
      // FLAME_COOL_DURATION - marks further back along the path (older,
      // more "distant") have had longer to cool and read dimmer than
      // ones the demon just struck. The glow layer inside still
      // flickers on its own fast cycle, scaled down by the parent's
      // cooling opacity.
      const blaze = buildBlazeTimeline(tsFrac, total, FLAME_FLOOR[theme]);
      flameUses.push(
        `<g opacity="0">` +
          `<animate attributeName="opacity" calcMode="linear" keyTimes="${blaze.keyTimes}" values="${blaze.values}" dur="${total.toFixed(3)}s" repeatCount="indefinite"/>` +
          `<use href="#f-flame" xlink:href="#f-flame" x="${cx.toFixed(2)}" y="${cy.toFixed(2)}"/>` +
          `<use href="#f-flame-glow" xlink:href="#f-flame-glow" x="${cx.toFixed(2)}" y="${cy.toFixed(2)}">` +
          `<animate attributeName="opacity" values="0.3;1;0.5;1;0.3" dur="0.6s" repeatCount="indefinite"/>` +
          `</use>` +
          `</g>`
      );
    }
  }

  // --- ember trail: one puff spawned per movement tick (skipped during
  // the stationary windup/impact beats, which have nothing to trail),
  // fading out, replaying every loop off the same shared keyTimes. ---
  const embers = ticks
    .map((tick, i) => (tick.sprite === "walkA" || tick.sprite === "walkB" ? i : -1))
    .filter((i) => i >= 0)
    .map((i) => {
      const tick = ticks[i];
      const { px, py } = cellOrigin(tick.x, tick.y);
      const ex = px + CELL / 2 - (3 * PIXEL_UNIT) / 2;
      const ey = py + CELL / 2 - (3 * PIXEL_UNIT) / 2;
      const tb = times[i] / total;
      const tb2 = Math.min(tb + EMBER_FADE / total, 0.999999);
      const safeTb2 = tb2 > tb ? tb2 : Math.min(tb + 0.000001, 0.9999999);
      return (
        `<use href="#f-ember" xlink:href="#f-ember" x="${ex.toFixed(2)}" y="${ey.toFixed(2)}">` +
        `<animate attributeName="opacity" calcMode="linear" keyTimes="0;${tb.toFixed(6)};${safeTb2.toFixed(6)};1" values="0;0.85;0;0" dur="${total.toFixed(3)}s" repeatCount="indefinite"/>` +
        `</use>`
      );
    })
    .join("");

  // --- moving demon: translate via discrete keyframes, frame variants
  // toggled via opacity keyed on the same timeline ---
  const posValues = ticks
    .map((tick) => {
      const { px, py } = cellOrigin(tick.x, tick.y);
      const x = px + CELL / 2 - SPRITE_PX_W / 2;
      const y = py + CELL / 2 - SPRITE_PX_H / 2;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(";");
  const firstPos = posValues.split(";")[0];

  function frameOpacityValues(spriteName, facing) {
    return (
      ticks
        .map((tick) => (tick.sprite === spriteName && tick.facing === facing ? "1" : "0"))
        .join(";") + ";0"
    );
  }

  const variantIds = [
    ["f-walkA-r", "walkA", "right"],
    ["f-walkA-l", "walkA", "left"],
    ["f-walkB-r", "walkB", "right"],
    ["f-walkB-l", "walkB", "left"],
    ["f-windup-r", "windup", "right"],
    ["f-windup-l", "windup", "left"],
    ["f-impact-r", "impact", "right"],
    ["f-impact-l", "impact", "left"],
  ];

  const variantUses = variantIds
    .map(([id, sprite, facing]) => {
      const values = frameOpacityValues(sprite, facing);
      const startsVisible = ticks[0].sprite === sprite && ticks[0].facing === facing;
      return (
        `<use href="#${id}" xlink:href="#${id}" opacity="${startsVisible ? 1 : 0}">` +
        `<animate attributeName="opacity" calcMode="discrete" keyTimes="${keyTimes}" values="${values}" dur="${total.toFixed(3)}s" repeatCount="indefinite"/>` +
        `</use>`
      );
    })
    .join("");

  const demonGroup =
    `<g transform="translate(${firstPos})">` +
    `<animateTransform attributeName="transform" type="translate" calcMode="discrete" keyTimes="${keyTimes}" values="${posValues};${firstPos}" dur="${total.toFixed(3)}s" repeatCount="indefinite"/>` +
    variantUses +
    `</g>`;

  const bg = theme === "dark" ? "#0d1117" : "#ffffff";

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
    `<rect x="0" y="0" width="${width}" height="${height}" fill="${bg}"/>` +
    `<defs>${defs}</defs>` +
    `<g>${cellRects.join("")}</g>` +
    `<g>${flameUses.join("")}</g>` +
    `<g>${embers}</g>` +
    demonGroup +
    `</svg>`
  );
}
