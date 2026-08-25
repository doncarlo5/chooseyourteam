import { describe, expect, it } from "vitest";
import {
  getFrozenArtworkRasterMetrics,
  shouldRasterizeFrozenArtwork,
} from "./touch-allocation-rendering-policy";

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

  it.each([1, 2, 3, 2.625, 4])(
    "keeps logical artwork dimensions while rasterizing at %sx",
    (pixelRatio) => {
      const metrics = getFrozenArtworkRasterMetrics(150, 24, pixelRatio);

      expect(metrics.logicalContentSize).toBe(150);
      expect(metrics.logicalPadding).toBe(24);
      expect(metrics.logicalImageSize).toBe(198);
      expect(metrics.physicalContentSize).toBe(Math.ceil(150 * pixelRatio));
      expect(metrics.physicalPadding).toBe(Math.ceil(24 * pixelRatio));
      expect(metrics.physicalImageSize).toBe(
        Math.ceil(150 * pixelRatio) + Math.ceil(24 * pixelRatio) * 2,
      );
    },
  );
});
