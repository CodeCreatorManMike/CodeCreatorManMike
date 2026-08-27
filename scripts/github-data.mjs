// Fetches live GitHub data via GraphQL and writes scripts/../data.json
// Requires env var GH_TOKEN with at least public_repo / read:user scope.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { GITHUB_LOGIN } from "./config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN = process.env.GH_TOKEN;
if (!TOKEN) {
  console.error("Missing GH_TOKEN env var");
  process.exit(1);
}

const query = /* GraphQL */ `
  query ($login: String!) {
    user(login: $login) {
      login
      followers {
        totalCount
      }
      repositories(privacy: PUBLIC) {
        totalCount
      }
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              weekday
            }
          }
        }
      }
      pinnedItems(first: 6, types: [REPOSITORY]) {
        nodes {
          ... on Repository {
            name
            url
            description
            primaryLanguage {
              name
            }
            isArchived
            pushedAt
          }
        }
      }
      repositoriesForLanguages: repositories(
        first: 100
        isFork: false
        privacy: PUBLIC
        orderBy: { field: PUSHED_AT, direction: DESC }
      ) {
        nodes {
          languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
            edges {
              size
              node {
                name
                color
              }
            }
          }
        }
      }
    }
  }
`;

async function main() {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": GITHUB_LOGIN,
    },
    body: JSON.stringify({ query, variables: { login: GITHUB_LOGIN } }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`GraphQL request failed: ${res.status} ${t}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  const user = json.data.user;

  // Aggregate language byte totals across repos
  const langTotals = new Map();
  for (const repo of user.repositoriesForLanguages.nodes) {
    for (const edge of repo.languages.edges) {
      const name = edge.node.name;
      const prev = langTotals.get(name) || { size: 0, color: edge.node.color };
      prev.size += edge.size;
      langTotals.set(name, prev);
    }
  }
  const totalBytes = [...langTotals.values()].reduce((a, b) => a + b.size, 0) || 1;
  const languages = [...langTotals.entries()]
    .map(([name, v]) => ({
      name,
      color: v.color || "#888888",
      bytes: v.size,
      pct: +((v.size / totalBytes) * 100).toFixed(2),
    }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 8);

  const calendar = user.contributionsCollection.contributionCalendar;

  // Flatten weeks/days for easy consumption downstream
  const weeks = calendar.weeks.map((w) => ({
    days: w.contributionDays.map((d) => ({
      date: d.date,
      count: d.contributionCount,
      weekday: d.weekday,
    })),
  }));

  // Compute current streak (consecutive days up to today with count > 0)
  const allDays = weeks.flatMap((w) => w.days);
  let currentStreak = 0;
  for (let i = allDays.length - 1; i >= 0; i--) {
    if (allDays[i].count > 0) currentStreak++;
    else break;
  }

  // Monthly sparkline: sum contributions per month for the last 12 months present
  const monthTotals = new Map();
  for (const d of allDays) {
    const month = d.date.slice(0, 7); // YYYY-MM
    monthTotals.set(month, (monthTotals.get(month) || 0) + d.count);
  }
  const months = [...monthTotals.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .slice(-12)
    .map(([month, total]) => ({ month, total }));

  const pinned = user.pinnedItems.nodes.map((r) => ({
    name: r.name,
    url: r.url,
    description: r.description,
    language: r.primaryLanguage ? r.primaryLanguage.name : "—",
    archived: r.isArchived,
    pushedAt: r.pushedAt,
  }));

  const data = {
    generatedAt: new Date().toISOString(),
    login: user.login,
    followers: user.followers.totalCount,
    publicRepos: user.repositories.totalCount,
    totalContributions: calendar.totalContributions,
    currentStreak,
    languages,
    months,
    weeks,
    pinned,
  };

  const outPath = path.join(__dirname, "..", "data.json");
  writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`Wrote ${outPath}`);
  console.log(
    `contributions=${data.totalContributions} streak=${data.currentStreak} repos=${data.publicRepos} followers=${data.followers} langs=${data.languages.length} pinned=${data.pinned.length}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
