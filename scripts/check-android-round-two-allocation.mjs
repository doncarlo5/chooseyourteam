import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import {
  countBrightRingPixels,
  countNeonRingPixels,
  countTeamGlowPixelsBeyondRasterBounds,
  countWhiteCenterPixels,
  measureWhiteNumberBounds,
  measureTeamColorRing,
} from "./screenshot-analysis.mjs";

const screenshotPath = join(tmpdir(), "android-round-two-allocation.png");
const fixtureState =
  process.env.ALLOCATION_FIXTURE_STATE ?? "round-two-dynamic";
const frozenCount = process.env.ALLOCATION_FROZEN_COUNT ?? "5";
const transitionMode = process.env.ALLOCATION_TRANSITION_MODE ?? "both";
const liveCount = process.env.ALLOCATION_LIVE_COUNT ?? "3";
const theme = process.env.ALLOCATION_THEME ?? "desert-lagoon";
const backgroundQuery = theme === "desert-lagoon" ? "" : "\\&background=1";
const route = `chooseyourteam:///__visual__/touch-allocation?state=${fixtureState}\\&frozenCount=${frozenCount}\\&transitionMode=${transitionMode}\\&liveCount=${liveCount}\\&theme=${theme}${backgroundQuery}`;

execFileSync("adb", [
  "shell",
  "am",
  "start",
  "-W",
  "-a",
  "android.intent.action.VIEW",
  "-d",
  route,
  "com.doncarlos.chooseyourteam",
]);
await new Promise((resolve) => setTimeout(resolve, 4000));
const screenshot = execFileSync("adb", ["exec-out", "screencap", "-p"]);
await import("node:fs/promises").then((fs) =>
  fs.writeFile(screenshotPath, screenshot),
);

const png = PNG.sync.read(await readFile(screenshotPath));
const densityOutput = execFileSync("adb", ["shell", "wm", "density"], {
  encoding: "utf8",
});
const densityMatch = densityOutput.match(
  /(?:Override|Physical) density:\s*(\d+)/,
);
const scale = densityMatch ? Number(densityMatch[1]) / 160 : png.width / 360;
const isPaletteCheck =
  theme === "neon-arena" &&
  (fixtureState === "revealed" || fixtureState === "quality-frozen");
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
      png,
      position.x,
      position.y,
      scale,
      position.color,
    );
    const numberBounds = measureWhiteNumberBounds(
      png,
      position.x,
      position.y,
      scale,
    );
    return {
      team: index + 1,
      ringPixels: measurement.ringPixels,
      whiteNumberPixels: countWhiteCenterPixels(
        png,
        measurement.x,
        measurement.y,
        scale,
      ),
      numberCenterOffsetY: numberBounds.y - position.y,
    };
  });
  const glowPixelsBeyondRasterBounds = countTeamGlowPixelsBeyondRasterBounds(
    png,
    positions[1].x,
    positions[1].y,
    scale,
    positions[1].color,
  );
  console.log(
    JSON.stringify({
      theme,
      fixtureState,
      teams,
      glowPixelsBeyondRasterBounds,
    }),
  );
  // The original circular rings retain their soft outer halo.
  if (
    teams.some(
      (team) =>
        team.ringPixels < 30 ||
        team.whiteNumberPixels < 30 ||
        Math.abs(team.numberCenterOffsetY) > 2,
    ) ||
    glowPixelsBeyondRasterBounds < 30
  ) {
    process.exitCode = 1;
  }
  process.exit();
}
const countRingPixels =
  theme === "neon-arena" ? countNeonRingPixels : countBrightRingPixels;
if (fixtureState === "quality-frozen") {
  const positions = [
    { x: 92, y: 300 },
    { x: 198, y: 420 },
    { x: 300, y: 310 },
    { x: 82, y: 520 },
    { x: 200, y: 565 },
  ];
  const teamRingPixels = positions.map((position) =>
    countRingPixels(png, position.x, position.y, scale),
  );
  console.log(JSON.stringify({ theme, fixtureState, teamRingPixels }));
  if (teamRingPixels.some((pixels) => pixels < 100)) {
    process.exitCode = 1;
  }
  process.exit();
}
const result = {
  theme,
  fixtureState,
  frozenCount: Number(frozenCount),
  transitionMode,
  firstRingPixels: countRingPixels(png, 92, 300, scale),
  secondRingPixels: countRingPixels(png, 198, 420, scale),
};
console.log(JSON.stringify(result));
if (result.firstRingPixels < 100 || result.secondRingPixels < 100) {
  process.exitCode = 1;
}
