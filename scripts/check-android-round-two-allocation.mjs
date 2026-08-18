import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";

const screenshotPath = join(tmpdir(), "android-round-two-allocation.png");
const fixtureState =
  process.env.ALLOCATION_FIXTURE_STATE ?? "round-two-dynamic";
const frozenCount = process.env.ALLOCATION_FROZEN_COUNT ?? "5";
const transitionMode = process.env.ALLOCATION_TRANSITION_MODE ?? "both";
const route = `chooseyourteam:///__visual__/touch-allocation?state=${fixtureState}\\&frozenCount=${frozenCount}\\&transitionMode=${transitionMode}`;

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
const scale = png.width / 360;
const countBrightRingPixels = (x, y) => {
  let count = 0;
  const centerX = x * scale;
  const centerY = y * scale;
  const innerRadius = 46 * scale;
  const outerRadius = 64 * scale;
  for (
    let row = Math.max(0, Math.floor(centerY - outerRadius));
    row <= Math.min(png.height - 1, centerY + outerRadius);
    row += 1
  ) {
    for (
      let column = Math.max(0, Math.floor(centerX - outerRadius));
      column <= Math.min(png.width - 1, centerX + outerRadius);
      column += 1
    ) {
      const distance = Math.hypot(column - centerX, row - centerY);
      if (distance < innerRadius || distance > outerRadius) continue;
      const offset = (row * png.width + column) * 4;
      if (
        png.data[offset] > 235 &&
        png.data[offset + 1] > 235 &&
        png.data[offset + 2] > 235
      ) {
        count += 1;
      }
    }
  }
  return count;
};

const result = {
  fixtureState,
  frozenCount: Number(frozenCount),
  transitionMode,
  firstRingPixels: countBrightRingPixels(92, 300),
  secondRingPixels: countBrightRingPixels(198, 420),
};
console.log(JSON.stringify(result));
if (result.firstRingPixels < 100 || result.secondRingPixels < 100) {
  process.exitCode = 1;
}
