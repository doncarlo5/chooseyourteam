import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import { countBrightRingPixels } from "./screenshot-analysis.mjs";

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
const result = {
  fixtureState,
  frozenCount: Number(frozenCount),
  transitionMode,
  firstRingPixels: countBrightRingPixels(png, 92, 300, scale),
  secondRingPixels: countBrightRingPixels(png, 198, 420, scale),
};
console.log(JSON.stringify(result));
if (result.firstRingPixels < 100 || result.secondRingPixels < 100) {
  process.exitCode = 1;
}
