import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const username = process.env.GITHUB_USERNAME || process.env.GITHUB_ACTOR || "zhoujungis";
const outputDir = path.resolve("assets");

const escapeXml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

async function fetchJson(url) {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "zhoujungis-profile-assets" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

const formatNumber = (value) => Number(value || 0).toLocaleString("en-US");

function renderGlance(data) {
  const sync = !data;
  const cards = [
    { label: "PUBLIC REPOS", value: sync ? "SYNC" : formatNumber(data.repos), accent: "#22D3EE", note: "open playgrounds" },
    { label: "FOLLOWERS", value: sync ? "SYNC" : formatNumber(data.followers), accent: "#F59E0B", note: "people in the loop" },
    { label: "TOTAL STARS", value: sync ? "SYNC" : formatNumber(data.stars), accent: "#FB7185", note: "signals of interest" },
    { label: "TOP LANGUAGE", value: sync ? "SYNC" : data.language, accent: "#A78BFA", note: "most-used recently" },
  ];
  const cardMarkup = cards.map((card, index) => {
    const x = 36 + (index * 270);
    return `<g transform="translate(${x} 116)">
      <rect width="246" height="150" rx="18" fill="#111827" stroke="#26364A"/>
      <rect x="20" y="20" width="34" height="4" rx="2" fill="${card.accent}"/>
      <text x="20" y="51" fill="#94A3B8" font-family="ui-monospace,monospace" font-size="10" font-weight="700" letter-spacing="2">${card.label}</text>
      <text x="20" y="96" fill="#F8FAFC" font-family="ui-sans-serif,system-ui,sans-serif" font-size="30" font-weight="800">${escapeXml(card.value)}</text>
      <text x="20" y="124" fill="#64748B" font-family="ui-sans-serif,system-ui,sans-serif" font-size="12">${card.note}</text>
    </g>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1140 300" role="img" aria-labelledby="title desc">
  <title id="title">GitHub at a glance for ${escapeXml(username)}</title>
  <desc id="desc">A locally generated profile metrics dashboard.</desc>
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#0B1220"/><stop offset="1" stop-color="#102B3A"/></linearGradient>
    <linearGradient id="line" x1="0" x2="1"><stop stop-color="#22D3EE"/><stop offset=".52" stop-color="#0E7490"/><stop offset="1" stop-color="#F59E0B"/></linearGradient>
  </defs>
  <rect width="1140" height="300" rx="22" fill="url(#bg)"/>
  <rect x="1" y="1" width="1138" height="298" rx="21" fill="none" stroke="#26364A"/>
  <rect x="36" y="28" width="8" height="56" rx="4" fill="url(#line)"/>
  <text x="62" y="48" fill="#67E8F9" font-family="ui-monospace,monospace" font-size="11" font-weight="700" letter-spacing="3">GITHUB / AT A GLANCE</text>
  <text x="62" y="78" fill="#F8FAFC" font-family="ui-sans-serif,system-ui,sans-serif" font-size="24" font-weight="800">A small dashboard for a very active curiosity</text>
  <text x="62" y="101" fill="#94A3B8" font-family="ui-sans-serif,system-ui,sans-serif" font-size="12">${sync ? "Waiting for the scheduled GitHub sync" : "Generated from the public GitHub API"}</text>
  ${cardMarkup}
</svg>`;
}

function renderTrophies() {
  const badges = [
    ["01", "BUILD", "Ideas into artifacts", "#22D3EE"],
    ["02", "SHIP", "Small, useful releases", "#F59E0B"],
    ["03", "LEARN", "Keep the loop open", "#A78BFA"],
    ["04", "SHARE", "Leave a better trail", "#FB7185"],
    ["05", "REPEAT", "Make it a practice", "#34D399"],
  ];
  const markup = badges.map(([number, title, note, accent], index) => {
    const x = 36 + (index * 216);
    return `<g transform="translate(${x} 110)">
      <rect width="194" height="116" rx="16" fill="#111827" stroke="#26364A"/>
      <circle cx="32" cy="32" r="17" fill="${accent}" opacity=".18" stroke="${accent}"/>
      <text x="32" y="36" text-anchor="middle" fill="${accent}" font-family="ui-monospace,monospace" font-size="10" font-weight="800">${number}</text>
      <text x="20" y="68" fill="#F8FAFC" font-family="ui-sans-serif,system-ui,sans-serif" font-size="15" font-weight="800">${title}</text>
      <text x="20" y="91" fill="#94A3B8" font-family="ui-sans-serif,system-ui,sans-serif" font-size="10">${note}</text>
    </g>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1140 260" role="img" aria-labelledby="title desc">
  <title id="title">Little trophy shelf</title>
  <desc id="desc">A custom locally generated shelf of developer milestones.</desc>
  <defs><linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#17122A"/><stop offset="1" stop-color="#3A211C"/></linearGradient></defs>
  <rect width="1140" height="260" rx="22" fill="url(#bg)"/>
  <rect x="1" y="1" width="1138" height="258" rx="21" fill="none" stroke="#4B3540"/>
  <text x="36" y="40" fill="#FCD34D" font-family="ui-monospace,monospace" font-size="11" font-weight="700" letter-spacing="3">MILESTONE SHELF / 2026</text>
  <text x="36" y="72" fill="#F8FAFC" font-family="ui-sans-serif,system-ui,sans-serif" font-size="24" font-weight="800">Tiny wins, arranged with intent</text>
  <text x="36" y="94" fill="#94A3B8" font-family="ui-sans-serif,system-ui,sans-serif" font-size="12">A hand-drawn alternative to a fragile external trophy widget.</text>
  ${markup}
</svg>`;
}

const profile = await fetchJson(`https://api.github.com/users/${encodeURIComponent(username)}`);
const repos = await fetchJson(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`);
const stats = profile && Array.isArray(repos)
  ? {
      repos: profile.public_repos,
      followers: profile.followers,
      stars: repos.reduce((sum, repo) => sum + Number(repo.stargazers_count || 0), 0),
      language: repos.find((repo) => repo.language)?.language || "Mixed",
    }
  : null;

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "github-glance.svg"), renderGlance(stats), "utf8");
await writeFile(path.join(outputDir, "trophy-shelf.svg"), renderTrophies(), "utf8");
console.log(`Wrote local profile assets${stats ? " with live public stats" : " in SYNC mode"}`);
