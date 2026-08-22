import { execFileSync, spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import {
  countBrightRingPixels,
  countNeonRingPixels,
  countWhiteCenterPixels,
  measureTeamColorRing,
} from "./screenshot-analysis.mjs";

const screenshotPath = join(tmpdir(), "touch-allocation-dynamic-check.png");
const theme = process.env.ALLOCATION_THEME ?? "desert-lagoon";
const fixtureState = process.env.ALLOCATION_FIXTURE_STATE ?? "dynamic";
const liveCount = process.env.ALLOCATION_LIVE_COUNT ?? "3";
const themeQuery =
  theme === "neon-arena" ? "&theme=neon-arena&background=1" : "";
const route = `chooseyourteam:///__visual__/touch-allocation?state=${fixtureState}&liveCount=${liveCount}${themeQuery}`;
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
const isPaletteCheck = theme === "neon-arena" && fixtureState === "revealed";
if (isPaletteCheck) {
  const positions = [
    { x: 92, y: 300, color: "#FF3B5C" },
    { x: 198, y: 420, color: "#39FF88" },
    { x: 300, y: 310, color: "#FFE34D" },
    { x: 82, y: 520, color: "#26D9FF" },
    { x: 200, y: 565, color: "#B66CFF" },
  ];
  const teams = positions.map((position, index) => {
    const measurement = measureTeamColorRing(
      screenshot,
      position.x,
      position.y,
      scale,
      position.color,
    );
    return {
      team: index + 1,
      ringPixels: measurement.ringPixels,
      whiteNumberPixels: countWhiteCenterPixels(
        screenshot,
        measurement.x,
        measurement.y,
        scale,
      ),
    };
  });
  console.log(JSON.stringify({ theme, fixtureState, teams }));
  if (
    teams.some((team) => team.ringPixels < 30 || team.whiteNumberPixels < 30)
  ) {
    process.exitCode = 1;
  }
  process.exit();
}
const fixturePixelOffset =
  (Math.round(200 * scale) * screenshot.width + Math.round(20 * scale)) * 4;
const fixturePixel = {
  red: screenshot.data[fixturePixelOffset],
  green: screenshot.data[fixturePixelOffset + 1],
  blue: screenshot.data[fixturePixelOffset + 2],
};
if (
  theme === "desert-lagoon" &&
  (fixturePixel.green <= fixturePixel.red ||
    fixturePixel.green <= fixturePixel.blue)
) {
  console.error(
    `Visual fixture did not open: unexpected background ${JSON.stringify(fixturePixel)}`,
  );
  process.exit(1);
}
const countRingPixels =
  theme === "neon-arena" ? countNeonRingPixels : countBrightRingPixels;
const firstRingPixels = countRingPixels(screenshot, 92, 300, scale);
const secondRingPixels = countRingPixels(screenshot, 198, 420, scale);
console.log(
  JSON.stringify({ theme, fixtureState, firstRingPixels, secondRingPixels }),
);
if (firstRingPixels < 100 || secondRingPixels < 100) {
  process.exitCode = 1;
}
