import { execFileSync, spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import { countBrightRingPixels } from "./screenshot-analysis.mjs";

const screenshotPath = join(tmpdir(), "touch-allocation-dynamic-check.png");
const route = "chooseyourteam:///__visual__/touch-allocation?state=dynamic";
const bundleIdentifier = "com.doncarlos.chooseyourteam";

const terminateAppIfRunning = () => {
  const result = spawnSync(
    "xcrun",
    ["simctl", "terminate", "booted", bundleIdentifier],
    { encoding: "utf8" },
  );
  if (result.status === 0 || result.status === 3) {
    return;
  }
  throw new Error(result.stderr || "Failed to terminate the simulator app");
};

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
      "--reset-cache",
    ],
    {
      env: { ...process.env, EXPO_PUBLIC_VISUAL_TEST_MODE: "1" },
      stdio: "ignore",
    },
  );
  terminateAppIfRunning();
  execFileSync("xcrun", ["simctl", "openurl", "booted", route]);
  await new Promise((resolve) => setTimeout(resolve, 6000));
  execFileSync("xcrun", [
    "simctl",
    "io",
    "booted",
    "screenshot",
    screenshotPath,
  ]);
} finally {
  await writeFile(bundlePath, originalBundle);
  terminateAppIfRunning();
  execFileSync("xcrun", ["simctl", "launch", "booted", bundleIdentifier]);
}

const screenshot = PNG.sync.read(await readFile(screenshotPath));
const scale = screenshot.width / 390;
const fixturePixelOffset =
  (Math.round(200 * scale) * screenshot.width + Math.round(20 * scale)) * 4;
const fixturePixel = {
  red: screenshot.data[fixturePixelOffset],
  green: screenshot.data[fixturePixelOffset + 1],
  blue: screenshot.data[fixturePixelOffset + 2],
};
if (
  fixturePixel.green <= fixturePixel.red ||
  fixturePixel.green <= fixturePixel.blue
) {
  console.error(
    `Visual fixture did not open: unexpected background ${JSON.stringify(fixturePixel)}`,
  );
  process.exit(1);
}
const firstRingPixels = countBrightRingPixels(screenshot, 92, 300, scale);
const secondRingPixels = countBrightRingPixels(screenshot, 198, 420, scale);
console.log(JSON.stringify({ firstRingPixels, secondRingPixels }));
if (firstRingPixels < 100 || secondRingPixels < 100) {
  process.exitCode = 1;
}
