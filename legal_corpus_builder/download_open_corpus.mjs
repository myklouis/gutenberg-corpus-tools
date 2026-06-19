#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const CATEGORY_QUERIES = {
  theology_religion: [
    "theology",
    "religion",
    "christianity",
    "bible",
    "church",
    "buddhism",
    "hinduism",
    "islam",
    "sacred texts",
  ],
  philosophy: [
    "philosophy",
    "ethics",
    "logic",
    "metaphysics",
    "plato",
    "aristotle",
    "stoicism",
    "epistemology",
  ],
  psychology: [
    "psychology",
    "psychoanalysis",
    "mind",
    "behavior",
    "dreams",
    "william james",
    "freud",
  ],
};

const args = parseArgs(process.argv.slice(2));
const outDir = path.resolve(args.out ?? "outputs/legal_corpus");
const perCategoryLimit = Number.parseInt(args.limit ?? "30", 10);
const delayMs = Number.parseInt(args.delay ?? "250", 10);
const maxPagesPerQuery = args.pages ? Number.parseInt(args.pages, 10) : Infinity;

if (Number.isNaN(perCategoryLimit) || perCategoryLimit < 0) {
  throw new Error("--limit must be a non-negative integer. Use 0 for no category limit.");
}

if (Number.isNaN(maxPagesPerQuery) || maxPagesPerQuery <= 0) {
  throw new Error("--pages must be a positive integer when provided.");
}

await mkdir(outDir, { recursive: true });

const downloaded = new Map();
let metadataRows = [];
let failures = [];

for (const [category, queries] of Object.entries(CATEGORY_QUERIES)) {
  console.log(`\n[${category}] starting`);
  const categoryDir = path.join(outDir, category);
  await mkdir(categoryDir, { recursive: true });

  const seenIds = new Set();
  const candidates = [];

  for (const query of queries) {
    console.log(`[${category}] searching "${query}"`);
    const works = await searchGutendex(query, perCategoryLimit || Infinity, maxPagesPerQuery);
    for (const work of works) {
      if (!seenIds.has(work.id)) {
        seenIds.add(work.id);
        candidates.push({ work, matchedQuery: query });
      }
      if (perCategoryLimit && candidates.length >= perCategoryLimit) break;
    }
    if (perCategoryLimit && candidates.length >= perCategoryLimit) break;
    await sleep(delayMs);
  }

  console.log(`[${category}] ${candidates.length} candidate texts found`);
  for (const { work, matchedQuery } of candidates) {
    const textUrl = pickTextFormat(work.formats);
    if (!textUrl) {
      failures.push({
        category,
        id: work.id,
        title: work.title,
        reason: "No plain text format in Gutendex metadata",
      });
      continue;
    }

    const filename = `${work.id}_${slug(work.title)}.txt`;
    const destination = path.join(categoryDir, filename);
    const downloadKey = `${work.id}:${textUrl}`;

    try {
      if (!downloaded.has(downloadKey)) {
        console.log(`[${category}] downloading ${work.id}: ${work.title}`);
        const text = await fetchText(textUrl);
        await writeFile(destination, normalizeText(text), "utf8");
        downloaded.set(downloadKey, destination);
      } else {
        console.log(`[${category}] already downloaded ${work.id}: ${work.title}`);
      }

      metadataRows.push({
        category,
        gutenberg_id: work.id,
        title: work.title,
        authors: work.authors.map((author) => author.name).join("; "),
        subjects: work.subjects.join("; "),
        languages: work.languages.join("; "),
        matched_query: matchedQuery,
        source: "Project Gutenberg via Gutendex",
        source_url: `https://www.gutenberg.org/ebooks/${work.id}`,
        downloaded_from: textUrl,
        local_path: path.relative(outDir, destination).replaceAll("\\", "/"),
        license_note: "Project Gutenberg public domain/open access terms apply; verify jurisdiction before redistribution.",
      });
    } catch (error) {
      console.warn(`[${category}] failed ${work.id}: ${error.message}`);
      failures.push({
        category,
        id: work.id,
        title: work.title,
        reason: error.message,
      });
    }

    await sleep(delayMs);
  }
  console.log(`[${category}] done`);
}

metadataRows.sort((a, b) =>
  a.category.localeCompare(b.category) ||
  Number(a.gutenberg_id) - Number(b.gutenberg_id)
);

await writeFile(
  path.join(outDir, "metadata.json"),
  JSON.stringify(metadataRows, null, 2) + "\n",
  "utf8",
);

await writeFile(
  path.join(outDir, "metadata.csv"),
  toCsv(metadataRows) + "\n",
  "utf8",
);

await writeFile(
  path.join(outDir, "download_failures.json"),
  JSON.stringify(failures, null, 2) + "\n",
  "utf8",
);

const summary = summarize(metadataRows, failures);
await writeFile(path.join(outDir, "SUMMARY.md"), summary, "utf8");
console.log(summary);

function parseArgs(rawArgs) {
  const parsed = {};
  for (let i = 0; i < rawArgs.length; i += 1) {
    const arg = rawArgs[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = rawArgs[i + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = "true";
    } else {
      parsed[key] = next;
      i += 1;
    }
  }
  return parsed;
}

async function searchGutendex(query, maxResults, maxPages) {
  const results = [];
  let url = `https://gutendex.com/books/?search=${encodeURIComponent(query)}`;
  let pageNumber = 0;

  while (url && results.length < maxResults && pageNumber < maxPages) {
    pageNumber += 1;
    console.log(`  page ${pageNumber}: ${url}`);
    const response = await fetch(url, {
      headers: { "user-agent": "legal-corpus-builder/1.0" },
    });
    if (!response.ok) {
      throw new Error(`Gutendex search failed for "${query}": ${response.status}`);
    }
    const page = await response.json();
    results.push(...page.results);
    console.log(`  collected ${results.length} results so far`);
    url = page.next;
  }

  return results.slice(0, maxResults);
}

function pickTextFormat(formats) {
  const entries = Object.entries(formats);
  const preferred = entries.find(([mime, url]) =>
    mime.startsWith("text/plain") && typeof url === "string" && url.includes("utf-8")
  );
  if (preferred) return preferred[1];

  const plain = entries.find(([mime, url]) =>
    mime.startsWith("text/plain") && typeof url === "string" && !url.endsWith(".zip")
  );
  if (plain) return plain[1];

  const zippedPlain = entries.find(([mime, url]) =>
    mime.startsWith("text/plain") && typeof url === "string"
  );
  return zippedPlain?.[1] ?? null;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "legal-corpus-builder/1.0" },
  });
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${url}`);
  }
  return await response.text();
}

function normalizeText(text) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "untitled";
}

function toCsv(rows) {
  const headers = [
    "category",
    "gutenberg_id",
    "title",
    "authors",
    "subjects",
    "languages",
    "matched_query",
    "source",
    "source_url",
    "downloaded_from",
    "local_path",
    "license_note",
  ];

  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ].join("\n");
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function summarize(rows, failures) {
  const byCategory = Object.fromEntries(
    Object.keys(CATEGORY_QUERIES).map((category) => [
      category,
      rows.filter((row) => row.category === category).length,
    ])
  );

  return `# Legal Open Corpus

Downloaded public-domain/open-access texts from Project Gutenberg metadata via Gutendex.

## Counts

${Object.entries(byCategory)
  .map(([category, count]) => `- ${category}: ${count} texts`)
  .join("\n")}
- failures: ${failures.length}

## Files

- metadata.json: full metadata for every downloaded text
- metadata.csv: spreadsheet-friendly metadata
- download_failures.json: works skipped because no plain text format was available or a download failed
- theology_religion/: theology and religion texts
- philosophy/: philosophy texts
- psychology/: psychology texts

## Re-run

From the workspace root:

\`\`\`bash
node outputs/legal_corpus_builder/download_open_corpus.mjs --out outputs/legal_corpus --limit 30
\`\`\`

Use \`--limit 0\` to fetch all Gutendex matches for the configured search terms. That can take a while and may create duplicate subject coverage, but files are still grouped by category and tracked in metadata.

## License Note

Project Gutenberg texts are public domain or distributed under Project Gutenberg terms. Public domain status can vary by country, so verify jurisdiction-specific redistribution rules before sharing the corpus.
`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
