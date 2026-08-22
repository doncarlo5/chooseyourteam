import { readFile } from "node:fs/promises";

const reportPath = process.argv[2];
if (!reportPath) {
  throw new Error(
    "Usage: node scripts/compare-allocation-performance.mjs <reports.jsonl>",
  );
}

const source = await readFile(reportPath, "utf8");
const reports = source
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const marker = line.indexOf("{");
    if (marker < 0) {
      return null;
    }
    return JSON.parse(line.slice(marker));
  })
  .filter(Boolean);

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
};

const groups = new Map();
for (const report of reports) {
  const key = `${report.model}|${report.os}|${report.scenario}`;
  const group = groups.get(key) ?? { simple: [], neon: [] };
  if (report.variant === "simple" || report.variant === "neon") {
    group[report.variant].push(report.p95FrameTimeMs);
  }
  groups.set(key, group);
}

if (groups.size === 0) {
  throw new Error("No allocation performance reports found");
}

let failed = false;
for (const [key, group] of groups) {
  if (group.simple.length < 3 || group.neon.length < 3) {
    console.error(
      `${key}: expected three simple and three neon runs, received ${group.simple.length} and ${group.neon.length}`,
    );
    failed = true;
    continue;
  }
  const simpleP95 = median(group.simple.slice(0, 3));
  const neonP95 = median(group.neon.slice(0, 3));
  const ratio = simpleP95 === 0 ? Number.POSITIVE_INFINITY : neonP95 / simpleP95;
  const result = {
    key,
    simpleMedianP95Ms: simpleP95,
    neonMedianP95Ms: neonP95,
    regressionPercent: (ratio - 1) * 100,
    passed: ratio <= 1.1,
  };
  console.log(JSON.stringify(result));
  failed ||= !result.passed;
}

if (failed) {
  process.exitCode = 1;
}
