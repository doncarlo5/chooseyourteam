import { expect, test } from "@playwright/test";

test("renders every admitted production touch", async ({ page, context }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.waitForTimeout(800);
  const cdp = await context.newCDPSession(page);
  const firstTouchArea = { x: 30, y: 230, width: 140, height: 140 };
  const secondTouchArea = { x: 220, y: 580, width: 140, height: 140 };
  const firstBaseline = await page.screenshot({ clip: firstTouchArea });
  const secondBaseline = await page.screenshot({ clip: secondTouchArea });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 100, y: 300, id: 1 }],
  });
  await page.waitForTimeout(400);
  const firstTouch = await page.screenshot({ clip: firstTouchArea });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: 100, y: 300, id: 1 },
      { x: 290, y: 650, id: 2 },
    ],
  });
  await page.waitForTimeout(400);
  const secondTouch = await page.screenshot({ clip: secondTouchArea });
  expect(firstTouch).not.toEqual(firstBaseline);
  expect(secondTouch).not.toEqual(secondBaseline);
});

test("configures a Session from the compact home panel", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByLabel("Up to 5 players")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Decrease players" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Decrease teams" }),
  ).toHaveCount(0);

  const teamsBox = await page.getByText("Teams", { exact: true }).boundingBox();
  const morePlayersBox = await page
    .getByText("More players", { exact: true })
    .boundingBox();
  expect(teamsBox?.y).toBeLessThan(morePlayersBox?.y ?? 0);

  const initialTeamValueBox = await page.getByLabel("Teams, 2").boundingBox();
  const initialPlayerValueBox = await page
    .getByLabel("Up to 5 players")
    .boundingBox();

  await page.getByRole("button", { name: "Select 6 players" }).click();
  await page.getByRole("button", { name: "Increase teams" }).click();
  await expect(page.getByLabel("Players, 6")).toBeVisible();
  await expect(page.getByLabel("Teams, 3")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Use up to 5 players" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Decrease teams" }),
  ).toBeVisible();

  const declaredTeamValueBox = await page.getByLabel("Teams, 3").boundingBox();
  const declaredPlayerValueBox = await page
    .getByLabel("Players, 6")
    .boundingBox();
  const horizontalCenter = (box: { x: number; width: number } | null) =>
    box ? box.x + box.width / 2 : null;
  expect(horizontalCenter(declaredTeamValueBox)).toBeCloseTo(
    horizontalCenter(initialTeamValueBox)!,
    1,
  );
  expect(horizontalCenter(declaredPlayerValueBox)).toBeCloseTo(
    horizontalCenter(initialPlayerValueBox)!,
    1,
  );

  await page
    .getByRole("button", { name: "Use up to 5 players" })
    .click();
  await expect(page.getByLabel("Up to 5 players")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Decrease players" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Select 6 players" }).click();

  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(page.locator("body")).toContainText("Put5fingers");
  await page.getByRole("button", { name: "Close" }).click();

  await expect(page.getByLabel("Players, 6")).toBeVisible();
  await expect(page.getByLabel("Teams, 3")).toBeVisible();
});

test("renders the compact home setup at a phone viewport", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "About" }).click();
  await page.getByRole("radio", { name: "Coral Sky" }).click();
  await page.getByRole("button", { name: "Close About" }).click();

  await expect(page.getByTestId("home-screen")).toHaveScreenshot(
    "home-setup.png",
    { animations: "disabled" },
  );
});

test("changes and restores the game theme from settings", async ({ page }) => {
  await page.goto("/");
  const home = page.getByTestId("home-screen");
  await expect(home).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");

  await page.getByRole("button", { name: "About" }).click();
  const themeHeading = page.getByText("Theme", { exact: true });
  const languageHeading = page.getByText("Language", { exact: true });
  const companyCredit = page.getByText("JT Company. Made in 🇫🇷", {
    exact: true,
  });
  await expect(themeHeading).toBeVisible();
  await expect(languageHeading).toBeVisible();
  await expect(companyCredit).toBeVisible();
  expect((await themeHeading.boundingBox())?.y).toBeLessThan(
    (await languageHeading.boundingBox())?.y ?? 0,
  );
  expect((await languageHeading.boundingBox())?.y).toBeLessThan(
    (await companyCredit.boundingBox())?.y ?? 0,
  );
  await expect(page.getByRole("link")).toHaveCount(0);
  await expect(page.getByText("Credits", { exact: true })).toHaveCount(0);
  await page.getByRole("radio", { name: "Coral Sky" }).click();
  await expect(page.getByTestId("coral-sky-background")).toBeVisible();
  await expect(page.getByTestId("coral-sky-background")).toHaveCSS(
    "background-color",
    "rgb(117, 219, 255)",
  );

  await page.reload();
  await expect(page.getByTestId("coral-sky-background")).toHaveCSS(
    "background-color",
    "rgb(117, 219, 255)",
  );
});
