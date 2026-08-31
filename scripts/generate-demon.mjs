import { mkdir, writeFile } from "node:fs/promises";
import {
  fetchContributionGrid,
  fetchContributionGridPublic,
  mockContributionGrid,
} from "./lib/contributions.mjs";
import { renderSVG } from "./lib/render.mjs";

const login = process.env.GITHUB_LOGIN || "katsdivi";
const token = process.env.GITHUB_TOKEN;
const useMock = process.argv.includes("--mock");
const outDir = process.env.OUT_DIR || ".";

// Real data first: GraphQL when a token is present, otherwise the public
// contributions page (no auth). Mock is only ever used when asked for.
async function loadGrid() {
  if (useMock) return { grid: mockContributionGrid(53, 42), source: "mock" };
  if (token) return { grid: await fetchContributionGrid(login, token), source: "graphql" };
  return { grid: await fetchContributionGridPublic(login), source: "public" };
}

async function main() {
  const { grid, source } = await loadGrid();

  const light = renderSVG(grid, "light");
  const dark = renderSVG(grid, "dark");

  await mkdir(outDir, { recursive: true });
  await writeFile(`${outDir}/demon.svg`, light);
  await writeFile(`${outDir}/demon-dark.svg`, dark);

  console.log(`Wrote ${outDir}/demon.svg and demon-dark.svg (${source} data).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
