export function shouldRasterizeFrozenArtwork(platform: string) {
  return platform === "android" || platform === "ios";
}

export function getFrozenArtworkRasterMetrics(
  contentSize: number,
  padding: number,
  pixelRatio: number,
) {
  const physicalContentSize = Math.ceil(contentSize * pixelRatio);
  const physicalPadding = Math.ceil(padding * pixelRatio);

  return {
    logicalContentSize: contentSize,
    logicalPadding: padding,
    logicalImageSize: contentSize + padding * 2,
    physicalContentSize,
    physicalPadding,
    physicalImageSize: physicalContentSize + physicalPadding * 2,
  };
}
