// Fetches a user's GitHub contribution calendar and normalizes it into a
// simple week x day grid of contribution levels (0-4), matching the shape
// GitHub's own contribution graph uses.

const QUERY = `
  query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          weeks {
            contributionDays {
              date
              contributionCount
              contributionLevel
            }
          }
        }
      }
    }
  }
`;

const LEVEL_MAP = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

export async function fetchContributionGrid(login, token) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: QUERY, variables: { login } }),
  });

  if (!res.ok) {
    throw new Error(`GitHub GraphQL request failed: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`GitHub GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  const weeks = json.data.user.contributionsCollection.contributionCalendar.weeks;

  return weeks.map((week) =>
    week.contributionDays.map((day) => ({
      date: day.date,
      count: day.contributionCount,
      level: LEVEL_MAP[day.contributionLevel] ?? 0,
    }))
  );
}

// Scrapes the public contributions calendar, which needs no token. GitHub's
// GraphQL API requires auth for this data, so this is the fallback that lets
// the generator produce a real grid locally (and in any context without a
// token). The markup exposes one <td> per day carrying data-date and
// data-level, which is exactly the shape we need.
export async function fetchContributionGridPublic(login) {
  const res = await fetch(`https://github.com/users/${encodeURIComponent(login)}/contributions`, {
    headers: { "User-Agent": "contribution-demon" },
  });
  if (!res.ok) {
    throw new Error(`GitHub contributions page failed: ${res.status}`);
  }

  const html = await res.text();
  const days = [];
  const cell = /<td[^>]*\bdata-date="(\d{4}-\d{2}-\d{2})"[^>]*\bdata-level="(\d)"[^>]*>/g;
  for (let m; (m = cell.exec(html)); ) {
    days.push({ date: m[1], level: Number(m[2]) });
  }
  if (!days.length) {
    throw new Error("no contribution cells found - GitHub markup may have changed");
  }

  // Bucket days into calendar weeks (columns), Sunday-first, mirroring the
  // week x day shape fetchContributionGrid returns.
  days.sort((a, b) => a.date.localeCompare(b.date));
  const weeks = [];
  let week = null;
  for (const day of days) {
    const weekday = new Date(`${day.date}T00:00:00Z`).getUTCDay();
    if (weekday === 0 || week === null) {
      week = [];
      weeks.push(week);
    }
    week[weekday] = { date: day.date, count: day.level, level: day.level };
  }

  // Pad ragged leading/trailing weeks so every column has 7 slots.
  return weeks.map((w) => {
    const full = [];
    for (let d = 0; d < 7; d++) full.push(w[d] ?? { date: null, count: 0, level: 0 });
    return full;
  });
}

// Deterministic fake grid for local iteration without hitting the API.
export function mockContributionGrid(weeksCount = 53, seed = 1) {
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };

  const grid = [];
  for (let w = 0; w < weeksCount; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const r = rand();
      const level = r < 0.35 ? 0 : r < 0.6 ? 1 : r < 0.8 ? 2 : r < 0.93 ? 3 : 4;
      week.push({ date: null, count: level, level });
    }
    grid.push(week);
  }
  return grid;
}
