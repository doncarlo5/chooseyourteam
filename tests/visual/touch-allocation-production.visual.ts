import { expect, test } from "@playwright/test";

test("renders every admitted production touch", async ({ page, context }) => {
  await page.goto("/");
  await page.getByLabel("Select 2 teams").click();
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
