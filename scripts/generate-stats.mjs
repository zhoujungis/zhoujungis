import { writeFile } from "node:fs/promises";
import path from "node:path";

const username = process.env.GITHUB_USERNAME || process.env.GITHUB_ACTOR || "zhoujungis";
const output = process.env.CONTRIBUTION_STATS_OUTPUT || "assets/stats.json";
const token = process.env.GITHUB_TOKEN;

async function graphql(query, variables) {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "zhoujungis-profile-stats",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) throw new Error(`GitHub GraphQL returned ${response.status}`);
  const body = await response.json();
  if (body.errors) throw new Error(`GraphQL errors: ${body.errors.map((e) => e.message).join("; ")}`);
  return body.data;
}

async function fetchContributions() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 365);
  const data = await graphql(
    `query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
            weeks { contributionDays { date contributionCount } }
          }
        }
      }
    }`,
    { login: username, from: from.toISOString(), to: to.toISOString() }
  );
  const calendar = data.user?.contributionsCollection?.contributionCalendar;
  if (!calendar?.weeks?.length) throw new Error("No contribution data returned");
  return calendar;
}

function computeStreaks(days) {
  let longest = 0;
  let running = 0;
  for (const day of days) {
    running = day.contributionCount > 0 ? running + 1 : 0;
    longest = Math.max(longest, running);
  }
  let current = 0;
  for (let i = days.length - 1; i >= 0; i -= 1) {
    if (days[i].contributionCount > 0) current += 1;
    else if (i === days.length - 1) continue;
    else break;
  }
  return { current, longest };
}

async function fetchRepoStats() {
  const repos = [];
  let page = 1;
  for (;;) {
    const response = await fetch(
      `https://api.github.com/users/${username}/repos?per_page=100&page=${page}&sort=pushed`,
      { headers: { Authorization: `bearer ${token}`, "User-Agent": "zhoujungis-profile-stats" } }
    );
    if (!response.ok) throw new Error(`GitHub REST returned ${response.status}`);
    const batch = await response.json();
    repos.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }

  const owned = repos.filter((repo) => !repo.fork && repo.owner.login === username);
  const bytes = {};
  for (const repo of owned) {
    const response = await fetch(`https://api.github.com/repos/${username}/${repo.name}/languages`, {
      headers: { Authorization: `bearer ${token}`, "User-Agent": "zhoujungis-profile-stats" },
    });
    if (!response.ok) continue;
    const languages = await response.json();
    for (const [language, size] of Object.entries(languages)) bytes[language] = (bytes[language] || 0) + size;
  }
  return { bytes, repoCount: repos.length };
}

if (!token) {
  console.warn("GITHUB_TOKEN not set; keeping existing stats.json.");
  process.exit(0);
}

const calendar = await fetchContributions();
const days = calendar.weeks.flatMap((week) => week.contributionDays);
const { current, longest } = computeStreaks(days);

let topLanguage = null;
let topLanguageShare = null;
let topLanguageLabel = null;
let publicRepos = null;
try {
  const { bytes, repoCount } = await fetchRepoStats();
  publicRepos = repoCount;
  const total = Object.values(bytes).reduce((sum, size) => sum + size, 0);
  const top = Object.entries(bytes).sort((a, b) => b[1] - a[1])[0];
  if (top) {
    topLanguage = top[0];
    topLanguageShare = total ? Math.round((top[1] / total) * 100) : null;
    topLanguageLabel = topLanguageShare === null ? topLanguage : `${topLanguage} ${topLanguageShare}%`;
  }
} catch (error) {
  console.warn(`Language stats unavailable (${error.message}); skipping.`);
}

const stats = {
  username,
  totalContributions: calendar.totalContributions,
  currentStreak: current,
  longestStreak: longest,
  publicRepos,
  topLanguage,
  topLanguageShare,
  topLanguageLabel,
  updatedAt: new Date().toISOString(),
};

await writeFile(path.resolve(output), JSON.stringify(stats, null, 2), "utf8");
console.log(`Wrote ${path.resolve(output)}: ${calendar.totalContributions} contributions, streak ${current} (best ${longest}), top ${topLanguage}`);
