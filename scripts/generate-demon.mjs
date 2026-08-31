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

// Real data first. GraphQL is tried when a token is present, but a workflow's
// default GITHUB_TOKEN is a repo-scoped installation token and generally
// cannot read another user's contributionsCollection - so any failure there
// falls through to the public contributions page, which needs no auth at all.
// Mock is only ever used when explicitly asked for.
async function loadGrid() {
  if (useMock) return { grid: mockContributionGrid(53, 42), source: "mock" };

  if (token) {
    try {
      return { grid: await fetchContributionGrid(login, token), source: "graphql" };
    } catch (err) {
      console.warn(`GraphQL calendar unavailable (${err.message}); falling back to public page.`);
    }
  }

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
