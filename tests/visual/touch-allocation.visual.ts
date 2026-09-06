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
    await expect(scene.getByTestId("allocation-scene-canvas")).toHaveCount(1);
    await expect(
      scene.getByTestId("allocation-scene-canvas").locator("canvas"),
    ).toHaveCount(1);
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

test("renders the Coral Sky background with its own sticker artwork", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) =>
    pageErrors.push(error.stack ?? error.message),
  );
  await page.goto(
    "/__visual__/touch-allocation?state=revealed&theme=coral-sky&background=1",
  );
  const scene = page.getByTestId("allocation-scene-fixture");
  const background = scene.getByTestId("coral-sky-background");
  await expect(scene).toBeVisible();
  await expect(background).toHaveCSS(
    "background-color",
    "rgb(117, 219, 255)",
  );
  await expect(scene.getByTestId("allocation-scene-canvas")).toHaveCount(1);
  await expect(
    scene.getByTestId("allocation-scene-canvas").locator("canvas"),
  ).toHaveCount(1);
  await expect(scene.getByLabel(/Player assigned to Team/)).toHaveCount(3);
  expect(pageErrors).toEqual([]);
  await expect(scene).toHaveScreenshot("coral-sky-background.png", {
    animations: "disabled",
  });
});

for (const fixtureState of [
  "unrevealed",
  "countdown",
  "revealed",
  "frozen",
  "scrolling",
] as const) {
  test(`renders the ${fixtureState} Neon Arena scene`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) =>
      pageErrors.push(error.stack ?? error.message),
    );
    await page.goto(
      `/__visual__/touch-allocation?state=${fixtureState}&theme=neon-arena&background=1`,
    );
    const scene = page.getByTestId("allocation-scene-fixture");
    await expect(scene).toBeVisible();
    await expect(
      scene.getByTestId("neon-arena-background-ready"),
    ).toBeVisible();
    await expect(
      scene.getByTestId("neon-arena-background-ready").locator("canvas"),
    ).toHaveCount(1);
    await expect(scene.getByTestId("allocation-scene-canvas")).toHaveCount(1);
    await expect(
      scene.getByTestId("allocation-scene-canvas").locator("canvas"),
    ).toHaveCount(1);
    expect(pageErrors).toEqual([]);
    await expect(scene).toHaveScreenshot(`neon-arena-${fixtureState}.png`, {
      animations: "disabled",
    });
  });
}

test("renders the maximum Neon Arena live load", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) =>
    pageErrors.push(error.stack ?? error.message),
  );
  await page.goto(
    "/__visual__/touch-allocation?state=countdown&theme=neon-arena&background=1&liveCount=12",
  );
  const scene = page.getByTestId("allocation-scene-fixture");
  await expect(scene).toBeVisible();
  await expect(scene.getByTestId("neon-arena-background-ready")).toBeVisible();
  await expect(
    scene.getByTestId("neon-arena-background-ready").locator("canvas"),
  ).toHaveCount(1);
  await expect(scene.getByTestId("allocation-scene-canvas")).toHaveCount(1);
  await expect(
    scene.getByTestId("allocation-scene-canvas").locator("canvas"),
  ).toHaveCount(1);
  expect(pageErrors).toEqual([]);
  await expect(scene).toHaveScreenshot("neon-arena-max-live.png", {
    animations: "disabled",
  });
});

test("renders all five Neon Arena team encodings", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) =>
    pageErrors.push(error.stack ?? error.message),
  );
  await page.goto(
    "/__visual__/touch-allocation?state=revealed&theme=neon-arena&background=1&liveCount=5",
  );
  const scene = page.getByTestId("allocation-scene-fixture");
  await expect(scene).toBeVisible();
  await expect(
    scene.getByTestId("neon-arena-background-ready").locator("canvas"),
  ).toHaveCount(1);
  await expect(
    scene.getByTestId("allocation-scene-canvas").locator("canvas"),
  ).toHaveCount(1);
  await expect(scene.getByLabel(/Player assigned to Team/)).toHaveCount(5);
  expect(pageErrors).toEqual([]);
  await expect(scene).toHaveScreenshot("neon-arena-team-palette.png", {
    animations: "disabled",
  });
});

test("composites overlapping revealed dots as complete layers", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) =>
    pageErrors.push(error.stack ?? error.message),
  );
  await page.goto(
    "/__visual__/touch-allocation?state=overlap&theme=neon-arena&background=1&liveCount=2",
  );
  const scene = page.getByTestId("allocation-scene-fixture");
  await expect(scene).toBeVisible();
  await expect(
    scene.getByTestId("allocation-scene-canvas").locator("canvas"),
  ).toHaveCount(1);
  await expect(scene.getByLabel(/Player assigned to Team/)).toHaveCount(2);
  expect(pageErrors).toEqual([]);
  await expect(scene).toHaveScreenshot("neon-arena-overlap.png", {
    animations: "disabled",
  });
});

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
