export function shouldRasterizeFrozenArtwork(platform: string) {
  return platform === "android" || platform === "ios";
}
