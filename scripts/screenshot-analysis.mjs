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

export const countNeonRingPixels = (png, x, y, scale) => {
  let count = 0;
  const centerX = x * scale;
  const centerY = y * scale;
  const innerRadius = 38 * scale;
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
      const red = png.data[offset];
      const green = png.data[offset + 1];
      const blue = png.data[offset + 2];
      const isPink = red > 150 && blue > 90 && red > green * 1.5;
      const isBlue = blue > 145 && blue > red * 1.15 && blue > green * 1.2;
      if (isPink || isBlue) {
        count += 1;
      }
    }
  }
  return count;
};

const parseHexColor = (color) => ({
  red: Number.parseInt(color.slice(1, 3), 16),
  green: Number.parseInt(color.slice(3, 5), 16),
  blue: Number.parseInt(color.slice(5, 7), 16),
});

export const measureTeamColorRing = (png, x, y, scale, color) => {
  const target = parseHexColor(color);
  const expectedX = x * scale;
  const expectedY = y * scale;
  const searchRadius = 90 * scale;
  let ringPixels = 0;
  let sumX = 0;
  let sumY = 0;
  for (
    let row = Math.max(0, Math.floor(expectedY - searchRadius));
    row <= Math.min(png.height - 1, expectedY + searchRadius);
    row += 1
  ) {
    for (
      let column = Math.max(0, Math.floor(expectedX - searchRadius));
      column <= Math.min(png.width - 1, expectedX + searchRadius);
      column += 1
    ) {
      const offset = (row * png.width + column) * 4;
      const colorDistance = Math.hypot(
        png.data[offset] - target.red,
        png.data[offset + 1] - target.green,
        png.data[offset + 2] - target.blue,
      );
      if (colorDistance <= 90) {
        ringPixels += 1;
        sumX += column;
        sumY += row;
      }
    }
  }
  return {
    ringPixels,
    x: ringPixels > 0 ? sumX / ringPixels / scale : x,
    y: ringPixels > 0 ? sumY / ringPixels / scale : y,
  };
};

export const countWhiteCenterPixels = (png, x, y, scale) => {
  let count = 0;
  const centerX = x * scale;
  const centerY = y * scale;
  const radius = 34 * scale;
  for (
    let row = Math.max(0, Math.floor(centerY - radius));
    row <= Math.min(png.height - 1, centerY + radius);
    row += 1
  ) {
    for (
      let column = Math.max(0, Math.floor(centerX - radius));
      column <= Math.min(png.width - 1, centerX + radius);
      column += 1
    ) {
      if (Math.hypot(column - centerX, row - centerY) > radius) continue;
      const offset = (row * png.width + column) * 4;
      if (
        png.data[offset] > 225 &&
        png.data[offset + 1] > 225 &&
        png.data[offset + 2] > 225
      ) {
        count += 1;
      }
    }
  }
  return count;
};

export const measureWhiteNumberBounds = (png, x, y, scale) => {
  const centerX = x * scale;
  const centerY = y * scale;
  const radius = 55 * scale;
  let count = 0;
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (
    let row = Math.max(0, Math.floor(centerY - radius));
    row <= Math.min(png.height - 1, centerY + radius);
    row += 1
  ) {
    for (
      let column = Math.max(0, Math.floor(centerX - radius));
      column <= Math.min(png.width - 1, centerX + radius);
      column += 1
    ) {
      if (Math.hypot(column - centerX, row - centerY) > radius) continue;
      const offset = (row * png.width + column) * 4;
      if (
        png.data[offset] <= 225 ||
        png.data[offset + 1] <= 225 ||
        png.data[offset + 2] <= 225
      ) {
        continue;
      }
      count += 1;
      minX = Math.min(minX, column);
      maxX = Math.max(maxX, column);
      minY = Math.min(minY, row);
      maxY = Math.max(maxY, row);
    }
  }
  return {
    count,
    x: count > 0 ? (minX + maxX) / 2 / scale : x,
    y: count > 0 ? (minY + maxY) / 2 / scale : y,
  };
};
