import { expect, test } from "@playwright/test";

const fixtureStates = [
  "unrevealed",
  "countdown",
  "revealed",
  "frozen",
  "scrolling",
] as const;

for (const fixtureState of fixtureStates) {
  test(`renders the ${fixtureState} allocation scene`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) =>
      pageErrors.push(error.stack ?? error.message),
    );
    await page.goto(`/__visual__/touch-allocation?state=${fixtureState}`);
    const scene = page.getByTestId("allocation-scene-fixture");
    await expect(scene).toBeVisible();
    await expect(scene.locator("canvas")).toHaveCount(1);
    expect(pageErrors).toEqual([]);
    await expect(scene).toHaveScreenshot(`${fixtureState}.png`, {
      animations: "disabled",
    });
  });
}
