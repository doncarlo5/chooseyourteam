import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const device = process.argv[2];
const outputPath = process.argv[3];
if (!device || !outputPath) {
  throw new Error(
    "Usage: node scripts/run-ios-allocation-performance.mjs <device> <output.jsonl>",
  );
}

const bundleIdentifier = "com.doncarlos.chooseyourteam";
const variants = ["simple", "neon"];
const scenarios = ["live-12", "frozen-5-live-2"];
const runs = [1, 2, 3];
const reportDirectory = await mkdtemp(
  join(tmpdir(), "allocation-performance-ios-"),
);
const reportPaths = [];

for (const scenario of scenarios) {
  for (const variant of variants) {
    for (const run of runs) {
      const reportName = `allocation-performance-${variant}-${scenario}-${run}.json`;
      const url = `chooseyourteam:///__performance__/allocation?variant=${variant}&scenario=${scenario}&run=${run}`;
      console.log(`Running ${variant} · ${scenario} · ${run}`);
      execFileSync(
        "xcrun",
        [
          "devicectl",
          "device",
          "process",
          "launch",
          "--device",
          device,
          "--terminate-existing",
          "--payload-url",
          url,
          bundleIdentifier,
        ],
        { stdio: "inherit" },
      );
      await new Promise((resolve) => setTimeout(resolve, 20_000));
      const localReportPath = join(reportDirectory, reportName);
      execFileSync(
        "xcrun",
        [
          "devicectl",
          "device",
          "copy",
          "from",
          "--device",
          device,
          "--source",
          `Documents/${reportName}`,
          "--destination",
          localReportPath,
          "--domain-type",
          "appDataContainer",
          "--domain-identifier",
          bundleIdentifier,
        ],
        { stdio: "inherit" },
      );
      reportPaths.push(localReportPath);
    }
  }
}

const reports = await Promise.all(
  reportPaths.map((reportPath) => readFile(reportPath, "utf8")),
);
await writeFile(outputPath, `${reports.join("\n")}\n`);
console.log(`Wrote ${reports.length} reports to ${outputPath}`);
