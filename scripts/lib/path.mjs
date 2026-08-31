// Builds a wandering, cell-by-cell walk that visits every filled
// (level > 0) cell in the grid exactly once, moving one grid step
// (up/down/left/right) at a time. No snake body / self-collision
// constraint - this is a lone sprite, so the walk is just a greedy
// nearest-unvisited-cell tour with randomized axis order per leg,
// which reads as organic wandering while still guaranteeing full,
// bounded-length coverage.

function makeRng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0xffffffff;
  };
}

function key(x, y) {
  return `${x},${y}`;
}

export function buildWanderPath(grid, seed = 42) {
  const rng = makeRng(seed);
  const width = grid.length;
  const height = width > 0 ? grid[0].length : 0;

  const remaining = new Map();
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (grid[x][y].level > 0) remaining.set(key(x, y), { x, y });
    }
  }

  if (remaining.size === 0) {
    return { steps: [{ x: 0, y: 0, dir: "right" }], smashAt: new Set() };
  }

  // Start at the first filled cell in reading order.
  let start = [...remaining.values()][0];
  let current = { x: start.x, y: start.y };

  const steps = [{ x: current.x, y: current.y, dir: "right" }];
  const smashAt = new Set([0]);
  remaining.delete(key(current.x, current.y));

  let facing = "right";

  while (remaining.size > 0) {
    // Nearest remaining cell by Manhattan distance (ties broken by rng).
    let best = null;
    let bestDist = Infinity;
    let bestJitter = Infinity;
    for (const cell of remaining.values()) {
      const d = Math.abs(cell.x - current.x) + Math.abs(cell.y - current.y);
      const jitter = rng();
      if (d < bestDist || (d === bestDist && jitter < bestJitter)) {
        best = cell;
        bestDist = d;
        bestJitter = jitter;
      }
    }

    // Walk from current to best one unit step at a time, randomizing
    // whether we close the x-gap or y-gap first on each step.
    let { x, y } = current;
    while (x !== best.x || y !== best.y) {
      const canX = x !== best.x;
      const canY = y !== best.y;
      const stepX = canX && (!canY || rng() < 0.5);

      if (stepX) {
        const dx = best.x > x ? 1 : -1;
        x += dx;
        facing = dx > 0 ? "right" : "left";
      } else {
        y += best.y > y ? 1 : -1;
      }

      steps.push({ x, y, dir: facing });
    }

    smashAt.add(steps.length - 1);
    remaining.delete(key(best.x, best.y));
    current = { x: best.x, y: best.y };
  }

  return { steps, smashAt };
}
