import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";

const screenshotPath = join(tmpdir(), "touch-allocation-dynamic-check.png");
const route = "chooseyourteam://__visual__/touch-allocation?state=dynamic";
const bundleIdentifier = "com.doncarlos.chooseyourteam";
const appPath = execFileSync(
  "xcrun",
  ["simctl", "get_app_container", "booted", bundleIdentifier, "app"],
  { encoding: "utf8" },
).trim();
const bundlePath = join(appPath, "main.jsbundle");
const originalBundle = await readFile(bundlePath);

try {
  execFileSync(
    "npx",
    [
      "expo",
      "export:embed",
      "--entry-file",
      "node_modules/expo-router/entry.js",
      "--platform",
      "ios",
      "--dev",
      "false",
      "--minify",
      "false",
      "--bundle-output",
      bundlePath,
      "--assets-dest",
      appPath,
    ],
    {
      env: { ...process.env, EXPO_PUBLIC_VISUAL_TEST_MODE: "1" },
      stdio: "ignore",
    },
  );
  execFileSync("xcrun", ["simctl", "terminate", "booted", bundleIdentifier]);
  execFileSync("xcrun", ["simctl", "launch", "booted", bundleIdentifier]);
  execFileSync("xcrun", ["simctl", "openurl", "booted", route]);
  await new Promise((resolve) => setTimeout(resolve, 1500));
  execFileSync("xcrun", [
    "simctl",
    "io",
    "booted",
    "screenshot",
    screenshotPath,
  ]);
} finally {
  await writeFile(bundlePath, originalBundle);
  execFileSync("xcrun", ["simctl", "terminate", "booted", bundleIdentifier]);
  execFileSync("xcrun", ["simctl", "launch", "booted", bundleIdentifier]);
}

const screenshot = PNG.sync.read(await readFile(screenshotPath));
const scale = screenshot.width / 390;
const countBrightRingPixels = (x, y) => {
  let count = 0;
  const centerX = x * scale;
  const centerY = y * scale;
  const innerRadius = 46 * scale;
  const outerRadius = 64 * scale;
  for (let row = Math.floor(centerY - outerRadius); row <= centerY + outerRadius; row += 1) {
    for (let column = Math.floor(centerX - outerRadius); column <= centerX + outerRadius; column += 1) {
      const distance = Math.hypot(column - centerX, row - centerY);
      if (distance < innerRadius || distance > outerRadius) continue;
      const offset = (row * screenshot.width + column) * 4;
      if (
        screenshot.data[offset] > 235 &&
        screenshot.data[offset + 1] > 235 &&
        screenshot.data[offset + 2] > 235
      ) {
        count += 1;
      }
    }
  }
  return count;
};

const firstRingPixels = countBrightRingPixels(92, 300);
const secondRingPixels = countBrightRingPixels(198, 420);
console.log(JSON.stringify({ firstRingPixels, secondRingPixels }));
if (firstRingPixels < 100 || secondRingPixels < 100) {
  process.exitCode = 1;
}
