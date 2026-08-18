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
