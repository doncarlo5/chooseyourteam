import { expect, test } from "@playwright/test";

const themes = [
  {
    id: "desert-lagoon",
    name: "Desert Lagoon",
    font: "Quicksand_700Bold",
    radius: "43px",
  },
  {
    id: "coral-sky",
    name: "Coral Sky",
    font: "Inter_900Black",
    radius: "24px",
  },
  {
    id: "neon-arena",
    name: "Neon Arena",
    font: "Rajdhani_700Bold",
    radius: "0px",
  },
];

for (const theme of themes) {
  test(`${theme.name} keeps its identity in French setup and settings`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await page.getByRole("button", { name: "About", exact: true }).click();
    await page.getByRole("radio", { name: theme.name, exact: true }).click();
    await page.getByRole("radio", { name: "Français", exact: true }).click();
    await expect(
      page.getByRole("radio", { name: theme.name, exact: true }),
    ).toBeChecked();
    await expect(page.getByRole("dialog")).toHaveScreenshot(
      `${theme.id}-settings-fr.png`,
      { animations: "disabled" },
    );
    await page.getByRole("button", { name: /Fermer/ }).click();
    const start = page.getByTestId("start-button");
    await expect(start).toHaveCSS("height", "86px");
    await expect(start.getByText(/.+/)).toHaveCSS("font-family", theme.font);
    await expect(start).toHaveCSS("border-top-left-radius", theme.radius);
    await expect(page.getByTestId("home-screen")).toHaveScreenshot(
      `${theme.id}-setup-fr.png`,
      { animations: "disabled" },
    );
    expect(errors).toEqual([]);
  });

  if (theme.id === "neon-arena") continue; // Covered by the existing Neon scene matrix.
  for (const state of [
    "unrevealed",
    "countdown",
    "revealed",
    "frozen",
    "overlap",
    "scrolling",
  ]) {
    test(`${theme.name} ${state} has themed artwork`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(
        `/__visual__/touch-allocation?theme=${theme.id}&state=${state}&liveCount=5`,
      );
      const scene = page.getByTestId("allocation-scene-fixture");
      await expect(scene.locator("canvas")).toHaveCount(1);
      await expect(scene).toHaveScreenshot(`${theme.id}-${state}.png`, {
        animations: "disabled",
      });
      expect(errors).toEqual([]);
    });
  }
}
