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
    if (fixtureState === "scrolling") {
      await expect(
        scene.getByTestId("fixture-round-one-labels"),
      ).not.toHaveAttribute("aria-hidden", "true");
      await expect(
        scene.getByTestId("fixture-round-two-labels"),
      ).toHaveAttribute("aria-hidden", "true");
    }
    expect(pageErrors).toEqual([]);
    await expect(scene).toHaveScreenshot(`${fixtureState}.png`, {
      animations: "disabled",
    });
  });
}

test("exposes only the settled Round result labels", async ({ page }) => {
  await page.goto("/__visual__/touch-allocation?state=frozen&round=1");
  const scene = page.getByTestId("allocation-scene-fixture");
  await expect(scene.locator("canvas")).toHaveCount(1);
  await expect(scene.getByTestId("fixture-round-one-labels")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await expect(
    scene.getByTestId("fixture-round-two-labels"),
  ).not.toHaveAttribute("aria-hidden", "true");
  await expect(
    scene
      .getByTestId("fixture-round-one-labels")
      .getByLabel(/Player assigned to Team/),
  ).toHaveCount(3);
  await expect(
    scene
      .getByTestId("fixture-round-two-labels")
      .getByLabel(/Player assigned to Team/),
  ).toHaveCount(2);
});
