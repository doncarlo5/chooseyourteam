export const countBrightRingPixels = (png, x, y, scale) => {
  let count = 0;
  const centerX = x * scale;
  const centerY = y * scale;
  const innerRadius = 46 * scale;
  const outerRadius = 64 * scale;
  for (
    let row = Math.max(0, Math.floor(centerY - outerRadius));
    row <= Math.min(png.height - 1, centerY + outerRadius);
    row += 1
  ) {
    for (
      let column = Math.max(0, Math.floor(centerX - outerRadius));
      column <= Math.min(png.width - 1, centerX + outerRadius);
      column += 1
    ) {
      const distance = Math.hypot(column - centerX, row - centerY);
      if (distance < innerRadius || distance > outerRadius) continue;
      const offset = (row * png.width + column) * 4;
      if (
        png.data[offset] > 235 &&
        png.data[offset + 1] > 235 &&
        png.data[offset + 2] > 235
      ) {
        count += 1;
      }
    }
  }
  return count;
};
