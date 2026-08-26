import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const username = process.env.GITHUB_USERNAME || process.env.GITHUB_ACTOR || "zhoujungis";
const output = process.env.CONTRIBUTION_CALENDAR_OUTPUT || "assets/contribution-calendar.svg";
const token = process.env.GITHUB_TOKEN;

const palette = {
  NONE: "#263136",
  FIRST_QUARTILE: "#315A58",
  SECOND_QUARTILE: "#4C9F8C",
  THIRD_QUARTILE: "#7CC7E8",
  FOURTH_QUARTILE: "#F6CA75",
};

const escapeXml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

function previewDays() {
  const levels = ["NONE", "FIRST_QUARTILE", "SECOND_QUARTILE", "THIRD_QUARTILE", "FOURTH_QUARTILE"];
  const weeks = [];
  for (let week = 0; week < 53; week += 1) {
    const days = [];
    for (let day = 0; day < 7; day += 1) {
      const wave = Math.sin((week * 0.42) + (day * 1.17)) + Math.cos((week * 0.19) - (day * 0.7));
      const level = wave > 1.22 ? 4 : wave > 0.35 ? 3 : wave > -0.45 ? 2 : wave > -1.1 ? 1 : 0;
      days.push({ date: "", contributionCount: level * 2, contributionLevel: levels[level] });
    }
    weeks.push(days);
  }
  return { weeks, total: 0, preview: true };
}

async function fetchContributionData() {
  if (!token) return previewDays();

  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 365);
  const query = `
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays { date contributionCount contributionLevel }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "zhoujungis-profile-calendar",
      },
      body: JSON.stringify({
        query,
        variables: { login: username, from: from.toISOString(), to: to.toISOString() },
      }),
    });
    if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
    const body = await response.json();
    const calendar = body.data?.user?.contributionsCollection?.contributionCalendar;
    const weeks = calendar?.weeks?.map((week) => week.contributionDays) || [];
    if (!weeks.length) throw new Error("No contribution data returned");
    return { weeks, total: calendar.totalContributions, preview: false };
  } catch (error) {
    console.warn(`Contribution data unavailable (${error.message}); using preview grid.`);
    return previewDays();
  }
}

function monthLabels(weeks) {
  const labels = [];
  let previousMonth = "";
  weeks.forEach((days, week) => {
    const day = days.find((item) => item.date);
    if (!day) return;
    const date = new Date(`${day.date}T00:00:00Z`);
    const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
    if (month !== previousMonth && week > 0) {
      labels.push({ month, week });
      previousMonth = month;
    }
  });
  return labels;
}

function renderSvg({ weeks, total, preview }) {
  const cells = weeks.slice(0, 53).flatMap((days, week) => days.slice(0, 7).map((day, index) => {
    const weekday = day.date ? new Date(`${day.date}T00:00:00Z`).getUTCDay() : index;
    const x = 92 + (week * 14);
    const y = 84 + (weekday * 14);
    const level = day.contributionLevel || "NONE";
    const title = day.date ? `${day.date}: ${day.contributionCount} contributions` : "Contribution cell";
    return `<rect x="${x}" y="${y}" width="10" height="10" rx="3" fill="${palette[level] || palette.NONE}"><title>${escapeXml(title)}</title></rect>`;
  })).join("");

  const labels = monthLabels(weeks).map(({ month, week }) =>
    `<text x="${92 + (week * 14)}" y="73" fill="#8FA1A5" font-family="ui-sans-serif,system-ui,sans-serif" font-size="10">${month}</text>`).join("");
  const subtitle = preview ? "Preview grid - refreshed weekly" : "Last 12 months - generated from GitHub contribution data";
  const totalLabel = preview ? "Contribution rhythm" : `${total.toLocaleString("en-US")} contributions`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 214" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(username)} contribution calendar</title>
  <desc id="desc">${escapeXml(totalLabel)} across the last 12 months.</desc>
  <defs>
    <linearGradient id="glow" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#4C9F8C"/><stop offset="1" stop-color="#F6CA75"/></linearGradient>
  </defs>
  <rect width="900" height="214" rx="18" fill="#151E22"/>
  <rect x="1" y="1" width="898" height="212" rx="17" fill="none" stroke="#3B4B50"/>
  <rect x="20" y="18" width="4" height="178" rx="2" fill="url(#glow)"/>
  <text x="40" y="32" fill="#89E3C1" font-family="ui-monospace,monospace" font-size="10" font-weight="700" letter-spacing="2">CONTRIBUTION RHYTHM</text>
  <text x="40" y="54" fill="#F7F4EC" font-family="ui-sans-serif,system-ui,sans-serif" font-size="20" font-weight="800">${escapeXml(totalLabel)}</text>
  ${subtitle ? `<text x="40" y="72" fill="#9AAAB0" font-family="ui-sans-serif,system-ui,sans-serif" font-size="11">${escapeXml(subtitle)}</text>` : ""}
  ${labels}
  <text x="40" y="100" fill="#8FA1A5" font-family="ui-sans-serif,system-ui,sans-serif" font-size="9">Sun</text>
  <text x="40" y="128" fill="#8FA1A5" font-family="ui-sans-serif,system-ui,sans-serif" font-size="9">Tue</text>
  <text x="40" y="156" fill="#8FA1A5" font-family="ui-sans-serif,system-ui,sans-serif" font-size="9">Thu</text>
  ${cells}
  <text x="640" y="202" fill="#8FA1A5" font-family="ui-sans-serif,system-ui,sans-serif" font-size="11">Less</text>
  <rect x="678" y="193" width="10" height="10" rx="3" fill="${palette.NONE}"/>
  <rect x="694" y="193" width="10" height="10" rx="3" fill="${palette.FIRST_QUARTILE}"/>
  <rect x="710" y="193" width="10" height="10" rx="3" fill="${palette.SECOND_QUARTILE}"/>
  <rect x="726" y="193" width="10" height="10" rx="3" fill="${palette.THIRD_QUARTILE}"/>
  <rect x="742" y="193" width="10" height="10" rx="3" fill="${palette.FOURTH_QUARTILE}"/>
  <text x="760" y="202" fill="#8FA1A5" font-family="ui-sans-serif,system-ui,sans-serif" font-size="11">More</text>
</svg>`;
}

const data = await fetchContributionData();
const destination = path.resolve(output);
await mkdir(path.dirname(destination), { recursive: true });
await writeFile(destination, renderSvg(data), "utf8");
console.log(`Wrote ${destination}${data.preview ? " (preview)" : ""}`);
