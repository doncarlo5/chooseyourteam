import { describe, expect, it } from "vitest";
import { shouldRasterizeFrozenArtwork } from "./touch-allocation-rendering-policy";

describe("touch allocation rendering policy", () => {
  it.each(["android", "ios"])(
    "rasterizes frozen artwork on native %s",
    (platform) => {
      expect(shouldRasterizeFrozenArtwork(platform)).toBe(true);
    },
  );

  it("keeps vector frozen artwork on web", () => {
    expect(shouldRasterizeFrozenArtwork("web")).toBe(false);
  });
});
