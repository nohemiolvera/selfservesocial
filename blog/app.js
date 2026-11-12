// Blog Templates: draws each size to canvas from the values below.

// ---- Design values ----

// ---- Brand: the only part to change for another brand ----
// Each brand has its colors per theme, a logo (in assets.js), where the logo sits in the
// header, how wide it is on customer stories, and the name used for downloads.
const BRANDS = {
  cloud: {
    file: "google-cloud",
    logo: (colors) => LOGOS.googleCloud.replace("fill:#5f6368", `fill:${colors.logoInk}`),
    header: { x: 52, y: 49, w: 196 },
    storyWidth: 250,
  },
  google: {
    file: "google",
    logo: () => LOGOS.google,
    header: { x: 50, y: 48, w: 100 },
    storyWidth: 200,
  },
};

const THEMES = {
  cloud: {
    light: { bg: "#F8F9FA", line: "#9AA0A6", ink: "#202124", story: "#202124", tag: "#202124", tagMuted: "#80868B", logoInk: "#5F6368" },
    dark: { bg: "#1F1F1F", line: "#9AA0A6", dotAlpha: 0.4, ink: "#E8EAED", story: "#F8F9FA", tag: "#BDC1C6", tagMuted: "#80868B", logoInk: "#E8EAED" },
  },
  google: {
    light: { bg: "#FFFFFF", line: "#9AA0A6", ink: "#202124", story: "#202124", tag: "#202124", tagMuted: "#80868B", logoInk: "#5F6368" },
    dark: { bg: "#202124", line: "#BDC1C6", ink: "#E8EAED", story: "#F8F9FA", tag: "#E8EAED", tagMuted: "#9AA0A6", logoInk: "#E8EAED" },
  },
};

const FONT = {
  headline: '400 48px "Instrument Sans", sans-serif',
  headlineTracking: "-1px",
  tag: '600 14px "JetBrains Mono", monospace',
  tagMuted: '400 14px "JetBrains Mono", monospace',
};

const SIZES = {
  master: { w: 1200, h: 675, name: "Open Graph" },
  featured: { w: 917, h: 450, name: "Featured" },
  square: { w: 450, h: 450, name: "Square" },
};

// Isometric dot field: the axes match the illustrations, which are not a
// symmetric 30/30 pair. Rising lines are a 2:1 slope (26.57°), falling lines 30°.
const FIELD = { rise: 0.5, fall: Math.tan(Math.PI / 6), alpha: 0.75, dotRadius: 1, snapTolerance: 0.75, minScale: 0.92 };

// Hatching in the rectangles above and below the illustration.
const HATCH = { slope: 1, spacing: 20, alpha: 0.45 };

// Master layout. Line positions are pixel rows, so lines are drawn at +0.5.
const GRID = {
  left: 20, right: 1179, top: 20, bottom: 654,
  headerY: 109, footerY: 610, splitX: 680,
  handle: 13,
  textX: 52, textWidth: 560, lineHeight: 58.5, textCenterY: 340.5, maxLines: 7,
  tagX: 43, tagBaseline: 638,
  illustrationX: 930.5, illustrationY: 359.5,
  illustrationSize: 280,
  storyMidY: 359, storyLogoY: 244, storyCustomerY: 480, storyCenterX: 929,
};

const DEFAULTS = {
  illustration: { headline: "Autoscaling AI Inference on Google Cloud Run with GPUs", category: "ENGINEERING" },
  texture: { headline: "Autoscaling AI Inference on Google Cloud Run with GPUs", category: "ENGINEERING" },
  customer: { headline: "How Acme cut deploy times in half on Google Cloud", category: "CUSTOMER STORY" },
};

const state = {
  brand: "cloud",
  template: "texture",
  theme: "light",
  headline: DEFAULTS.texture.headline,
  category: DEFAULTS.texture.category,
  label: "GOOGLE BLOG",
  illustration: "migration",
  customIllustration: "",
  asciiIcon: "lock",
  asciiSvg: "",
  stroke: 1,
  fieldSpacing: 20,
  customerLogo: "",
  customerWidth: 158,
  texture: "settle",
  motion: "draw",
  textMotion: "none",
  loopLength: 30,
  density: 2,
};

// Seconds into the texture loop; the animation advances it and exports use it as-is.
let textureTime = 0;

// ---- Drawing helpers ----

const crisp = (n) => n + 0.5;

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(crisp(x1), crisp(y1));
  ctx.lineTo(crisp(x2), crisp(y2));
  ctx.stroke();
}

function handle(ctx, x, y, size, colors) {
  const half = (size - 1) / 2;
  ctx.fillStyle = colors.bg;
  ctx.fillRect(x - half, y - half, size, size);
  ctx.strokeRect(crisp(x - half), crisp(y - half), size - 1, size - 1);
}

function wrapLines(ctx, text, maxWidth) {
  const lines = [];
  for (const paragraph of text.split("\n")) {
    let current = "";
    for (const word of paragraph.split(" ")) {
      const next = current ? `${current} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    lines.push(current);
  }
  return lines;
}

function drawCentered(ctx, image, cx, cy, width) {
  const height = width * (image.naturalHeight / image.naturalWidth);
  ctx.drawImage(image, cx - width / 2, cy - height / 2, width, height);
}

function drawFitted(ctx, image, cx, cy, box) {
  const scale = box / Math.max(image.naturalWidth, image.naturalHeight);
  drawCentered(ctx, image, cx, cy, image.naturalWidth * scale);
}

// Dots sit where the two axes cross, with (anchorX, anchorY) as one of them.
function drawField(ctx, x, y, w, h, anchorX, anchorY, colors) {
  const { rise, fall, dotRadius } = FIELD;
  const step = state.fieldSpacing;
  const period = step * (rise + fall);
  const firstColumn = Math.ceil((x - anchorX) / step);
  const lastColumn = Math.floor((x + w - anchorX) / step);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = colors.line;
  ctx.globalAlpha = colors.dotAlpha ?? FIELD.alpha;
  ctx.beginPath();
  for (let column = firstColumn; column <= lastColumn; column++) {
    const dotX = anchorX + column * step;
    const offset = anchorY - rise * column * step;
    for (let row = Math.ceil((y - offset) / period); row <= Math.floor((y + h - offset) / period); row++) {
      const dotY = offset + row * period;
      ctx.moveTo(dotX + dotRadius, dotY);
      ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
    }
  }
  ctx.fill();
  ctx.restore();
}

function drawHatch(ctx, x, y, w, h, colors) {
  const run = h / HATCH.slope;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = colors.line;
  ctx.globalAlpha = HATCH.alpha;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let lineX = x - run; lineX < x + w; lineX += HATCH.spacing) {
    ctx.moveTo(lineX, y + h);
    ctx.lineTo(lineX + run, y);
  }
  ctx.stroke();
  ctx.restore();
}

// Best field phase for one family: the offset that puts the most edge length on a line.
function bestPhase(intercepts, period) {
  let best = { phase: 0, score: -1 };
  for (const candidate of intercepts) {
    let score = 0;
    for (const { value, length } of intercepts) {
      const offset = Math.abs(((value - candidate.value) % period + period * 1.5) % period - period / 2);
      if (offset <= FIELD.snapTolerance) score += length;
    }
    if (score > best.score) best = { phase: candidate.value, score };
  }
  return best;
}

// Sizes the illustration and places the field so its edges land on field lines.
// The size only ever shrinks from `box`, so the art stays inside the field.
function fitToField(images, cx, cy, box) {
  const { rise, fall } = FIELD;
  const { edges, viewBox } = images.illustrationShape;
  const period = state.fieldSpacing * (rise + fall);
  const baseScale = box / Math.max(viewBox.w, viewBox.h);
  let best = { size: box, anchorX: cx, anchorY: cy, score: -1 };

  for (let ratio = 1; ratio >= FIELD.minScale; ratio -= 0.005) {
    const scale = baseScale * ratio;
    const left = cx - (viewBox.w * scale) / 2;
    const top = cy - (viewBox.h * scale) / 2;
    const toCanvas = (edge) => ({
      x: left + (edge.x - viewBox.x) * scale,
      y: top + (edge.y - viewBox.y) * scale,
      length: edge.length * scale,
    });
    const interceptsOf = (family, slope) => family.map(toCanvas)
      .map(({ x, y, length }) => ({ value: y + slope * x, length }));
    const rising = bestPhase(interceptsOf(edges.rising, rise), period);
    const falling = bestPhase(interceptsOf(edges.falling, -fall), period);
    const score = rising.score + falling.score;
    if (score > best.score + 1e-6) {
      const anchorX = (rising.phase - falling.phase) / (rise + fall);
      best = { size: box * ratio, anchorX, anchorY: rising.phase - rise * anchorX, score };
    }
  }
  return best;
}

// ---- Textures ----
// Each one is drawn in its own frame (w × h), scaled to cover the box like
// preserveAspectRatio="xMidYMid slice". To add one, write its draw function and list it in TEXTURES.

// The point the textures react to, drifting on its own in 0–1 units. The frequencies
// are whole numbers so it closes after one loopLength.
function drift(time) {
  const a = (2 * Math.PI * time) / state.loopLength;
  return {
    u: 0.5 + 0.5 * (0.76 * Math.sin(4 * a) + 0.2 * Math.sin(8 * a + 1.2)),
    v: 0.5 + 0.5 * (0.72 * Math.sin(3 * a + 0.8) + 0.2 * Math.sin(5 * a + 2.1)),
  };
}

// Settle: bar columns that gather toward the point.
// Bar columns in a 732 × 516 frame: [x, tops of each bar].
const SETTLE = {
  w: 732, h: 516, barW: 31.287, barH: 8.683, gap: 3,
  sigmaX: 90, sigmaY: 130, pull: 0.85,
  // Bar thickness in output pixels, whatever the size. Bars keep their original centers.
  thickness: 1,
  cols: [
    [17, [47.17, 100.05, 150.79, 197.26, 241.59, 282.18, 320.1, 353.22, 383.13, 411.44, 434.4, 455.23, 473.93, 491.29]],
    [52.04, [64.54, 116.88, 167.09, 214.62, 257.35, 299.55, 336.4, 370.58, 401.56, 428.8, 452.3, 473.67, 491.29]],
    [87.08, [26.61, 81.09, 135.57, 186.32, 232.78, 277.11, 318.78, 355.63, 388.74, 419.72, 448.03, 469.93, 491.29]],
    [122.11, [49.58, 103.53, 156.4, 207.68, 254.68, 298.48, 340.14, 376.46, 410.64, 441.09, 469.39, 491.29]],
    [157.15, [73.08, 129.7, 183.64, 233.32, 280.85, 323.05, 365.24, 401.56, 437.35, 467.26, 491.29]],
    [192.19, [42.1, 102.46, 158.01, 211.42, 262.16, 308.63, 352.96, 392.48, 432.01, 464.59, 491.29]],
    [227.23, [73.08, 132.9, 188.98, 242.93, 293.67, 341.21, 383.4, 424.53, 462.45, 491.29]],
    [262.26, [44.24, 104.6, 166.02, 222.1, 276.05, 325.72, 373.25, 416.52, 458.18, 491.29]],
    [297.3, [17, 81.09, 144.12, 202.34, 257.89, 363.11, 408.51, 450.7, 491.29]],
    [332.34, [54.92, 120.62, 184.18, 245.07, 300.08, 351.89, 403.17, 448.56, 491.29]],
    [367.38, [17, 59.73, 105.13, 156.4, 208.21, 263.23, 324.11, 387.67, 453.37]],
    [402.41, [17, 57.59, 99.79, 145.19, 250.41, 305.96, 364.17, 427.2, 491.29]],
    [437.45, [17, 50.11, 91.78, 135.04, 182.57, 232.25, 286.19, 342.28, 403.7, 464.05]],
    [472.49, [17, 45.84, 83.76, 124.89, 167.09, 214.62, 265.36, 319.31, 375.39, 435.21]],
    [507.53, [17, 43.7, 76.29, 115.81, 155.33, 199.67, 246.13, 296.87, 350.29, 405.83, 466.19]],
    [542.56, [17, 41.04, 70.95, 106.73, 143.05, 185.25, 227.44, 274.98, 324.65, 378.6, 435.21]],
    [577.6, [17, 38.9, 67.21, 97.65, 131.83, 168.15, 209.82, 253.61, 300.61, 351.89, 404.77, 458.71]],
    [612.64, [17, 38.36, 60.26, 88.57, 119.55, 152.66, 189.52, 231.18, 275.51, 321.98, 372.72, 427.2, 481.68]],
    [647.68, [17, 34.63, 55.99, 79.49, 106.73, 137.71, 171.89, 208.75, 250.94, 293.67, 341.21, 391.41, 443.76]],
    [682.71, [17, 34.36, 53.06, 73.89, 96.86, 125.16, 155.08, 188.19, 226.11, 266.71, 311.04, 357.5, 408.24, 461.12]],
  ],
};

// The columns stop short of the frame's top and bottom. Repeating each column's end
// spacing past both edges keeps bars all the way to the edge, even while they gather.
const SETTLE_COLS = SETTLE.cols.map(([x, tops]) => {
  const extended = [...tops];
  const up = tops[1] - tops[0];
  const down = tops[tops.length - 1] - tops[tops.length - 2];
  while (extended[0] > -SETTLE.h / 4) extended.unshift(extended[0] - up);
  while (extended[extended.length - 1] < SETTLE.h * 1.25) extended.push(extended[extended.length - 1] + down);
  return [x, extended];
});

// Adds evenly spaced bars between each pair, so rows sit closer together.
function denser(tops, density) {
  const out = [];
  tops.forEach((top, j) => {
    out.push(top);
    const next = tops[j + 1];
    if (next != null) for (let k = 1; k < density; k++) out.push(top + ((next - top) * k) / density);
  });
  return out;
}

function drawSettle(ctx, s, ox, oy, time) {
  const { w, h, barW, barH, gap, sigmaX, sigmaY, pull, thickness } = SETTLE;
  const { u, v } = drift(time);
  const x = u * w;
  const y = v * h;
  SETTLE_COLS.forEach(([colX, original]) => {
    const dx = colX + barW / 2 - x;
    const wx = Math.exp(-(dx * dx) / (2 * sigmaX * sigmaX));
    const ys = denser(original, state.density).map((top) => {
      const dy = y - (top + barH / 2);
      return top + dy * wx * Math.exp(-(dy * dy) / (2 * sigmaY * sigmaY)) * pull;
    });
    // Keep bars from overlapping: push down, then back up.
    for (let j = 1; j < ys.length; j++) ys[j] = Math.max(ys[j], ys[j - 1] + gap);
    for (let j = ys.length - 2; j >= 0; j--) ys[j] = Math.min(ys[j], ys[j + 1] - gap);
    for (const top of ys) {
      // Snapped to whole pixels so the thin bars stay sharp instead of blurring across two rows.
      const barY = Math.round(oy + (top + barH / 2) * s - thickness / 2);
      ctx.rect(ox + colX * s, barY, barW * s, thickness);
    }
  });
}

// Warp: a grid of small dots that swell into a soft bubble near the point.
// The grid is set in output pixels, so the dots keep the same size and spacing in every size.
const WARP = {
  w: 1, h: 0.7053, radius: 0.35 * 0.7053,
  dot: 2, // resting dot size, px
  gap: 15, // space between resting dots, px
  maxDot: 6, // size at the center of the bubble, px
};

function drawWarp(ctx, s, ox, oy, time, box) {
  const { w, h, radius, dot, gap, maxDot } = WARP;
  const pitch = dot + gap;
  const { u, v } = drift(time);
  const px = ox + u * w * s;
  const py = oy + v * h * s;
  const r = radius * s;
  const cols = Math.floor(box.w / pitch);
  const rows = Math.floor(box.h / pitch);
  // Center the grid in the box, on whole pixels.
  const left = Math.round(box.x + (box.w - (cols - 1) * pitch) / 2);
  const top = Math.round(box.y + (box.h - (rows - 1) * pitch) / 2);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = left + col * pitch;
      const cy = top + row * pitch;
      const q = Math.max(0, 1 - Math.hypot(px - cx, py - cy) / r);
      const size = dot + (maxDot - dot) * q * q * (3 - 2 * q); // smoothstep
      ctx.moveTo(cx + size / 2, cy);
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    }
  }
}

// Flicker: squares that switch to a random opacity now and then. Each square has a fixed,
// seeded run of opacities that repeats every loopLength.
const FLICKER = {
  square: 5, // px
  gap: 7, // px
  maxOpacity: 0.3, // most squares stay soft, up to this opacity
  // A few squares at a time light up sharp, so the grid has some crisp points.
  sharpShare: 0.08, // share of squares that are sharp at any moment
  sharpOpacity: 0.85, // sharp squares sit between this and full
  rate: 0.3, // changes per square per second, on average
  levels: 20, // opacities are rounded to this many steps, so each step is one fill
};

// Repeatable random number in [0, 1) for a pair of integers.
function hash(a, b) {
  let h = Math.imul(a, 374761393) ^ Math.imul(b, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function drawFlicker(ctx, s, ox, oy, time, box) {
  const { square, gap, maxOpacity, sharpShare, sharpOpacity, rate, levels } = FLICKER;
  const pitch = square + gap;
  const cols = Math.floor((box.w + gap) / pitch);
  const rows = Math.floor((box.h + gap) / pitch);
  const left = Math.round(box.x + (box.w - (cols * pitch - gap)) / 2);
  const top = Math.round(box.y + (box.h - (rows * pitch - gap)) / 2);
  const progress = time / state.loopLength;
  const buckets = Array.from({ length: levels + 1 }, () => []);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = row * cols + col;
      // Each square changes a whole number of times per loop, at its own pace and offset.
      const changes = Math.max(1, Math.round(state.loopLength * rate * (0.5 + hash(cell, 1))));
      const step = Math.floor(progress * changes + hash(cell, 2) * changes) % changes;
      const roll = hash(cell, step + 3);
      const opacity = roll < sharpShare
        ? sharpOpacity + (1 - sharpOpacity) * (roll / sharpShare)
        : maxOpacity * ((roll - sharpShare) / (1 - sharpShare));
      const level = Math.round(opacity * levels);
      buckets[level].push(left + col * pitch, top + row * pitch);
    }
  }
  buckets.forEach((cells, level) => {
    if (!level || !cells.length) return;
    ctx.globalAlpha = level / levels;
    ctx.beginPath();
    for (let i = 0; i < cells.length; i += 2) ctx.rect(cells[i], cells[i + 1], square, square);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.beginPath();
}

// ASCII: a simple icon drawn in characters over a faint field of glyphs. The icon is soft: its
// edges are blurred, so near them the characters thin out and lighten until they meet the
// background field, with no hard outline. A slow wave passes over it and every cell flickers to
// a neighbor now and then, all on whole numbers of cycles per loop, so it closes after one loopLength.
const ASCII = {
  cellW: 7, cellH: 10.5, // px per character
  font: '500 10px "JetBrains Mono", monospace',
  ramp: [".", "-", "^", "v", "V", "A", "◊"], // icon characters, light to heavy
  softness: 0.6, // edge blur, in cells
  fillGap: 0.12, // share of cells blank at any moment, even deep inside the icon
  size: 0.7, // icon height, as a share of the box (or width, if that runs out first)
  flicker: 1.5, // character changes per cell per second, on average
  sample: 4, // mask pixels per cell side
  // Background: a faint field of glyphs that drifts in patches around the icon.
  bg: [".", ":", ";", "=", "+", "*", "?", "%", "$", "#"], // light to heavy
  bgOpacity: 0.55,
  bgAmount: 1, // how much of the densest patches fill, 0–1
  bgBase: 0.2, // share of cells with a glyph even between patches
  bgFrom: 0.15, // patch level where glyphs start; lower spreads them further
};

// Bold icons on a 24 grid, made to read at character size: solid shapes with holes cut out.
const ASCII_ICONS = [
  { id: "lock", label: "Lock", solid: ["M6.5 10V7.5a5.5 5.5 0 0 1 11 0V10h-2.6V7.5a2.9 2.9 0 0 0-5.8 0V10z", "M3.5 10h17v12h-17z"], holes: ["M10.6 14.2h2.8v4.6h-2.8z"] },
  { id: "shield", label: "Shield", solid: ["M12 1.5l9 3.4v6.6c0 5.6-3.8 9.9-9 11.5-5.2-1.6-9-5.9-9-11.5V4.9z"], holes: ["M7.2 12.1l1.9-1.9 2 2 4.6-4.6 1.9 1.9-6.5 6.5z"] },
  { id: "cloud", label: "Cloud", solid: ["M6.5 20a5.5 5.5 0 0 1-.9-10.9A7 7 0 0 1 19 8.6a5.7 5.7 0 0 1-.7 11.4z"], holes: [] },
  { id: "database", label: "Database", solid: ["M3 5.5C3 3.6 7 2 12 2s9 1.6 9 3.5v13c0 1.9-4 3.5-9 3.5s-9-1.6-9-3.5z"], holes: ["M3 9.6c1.4 1.4 5 2.4 9 2.4s7.6-1 9-2.4v2c-1.4 1.4-5 2.4-9 2.4s-7.6-1-9-2.4z", "M3 14.6c1.4 1.4 5 2.4 9 2.4s7.6-1 9-2.4v2c-1.4 1.4-5 2.4-9 2.4s-7.6-1-9-2.4z"] },
  { id: "server", label: "Servers", solid: ["M2.5 2.5h19v5.5h-19z", "M2.5 9.25h19v5.5h-19z", "M2.5 16h19v5.5h-19z"], holes: ["M5 4.5h2.4v1.6H5z", "M5 11.2h2.4v1.6H5z", "M5 17.9h2.4v1.6H5z"] },
  { id: "terminal", label: "Terminal", solid: ["M1.5 3.5h21v17h-21z"], holes: ["M4.8 8.6l1.7-1.7 5.1 5.1-5.1 5.1-1.7-1.7 3.4-3.4z", "M12.6 15.2h6.4v2.2h-6.4z"] },
  { id: "bolt", label: "Bolt", solid: ["M14 1.5L4 14h7l-1.5 8.5L20 9.5h-7z"], holes: [] },
  { id: "key", label: "Key", solid: ["M7.5 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12z", "M12 8.6h10.5v3.2h-2.2v3.4h-3v-3.4H12z"], holes: ["M7.5 7.8a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4z"] },
  { id: "globe", label: "Globe", solid: ["M12 1.5a10.5 10.5 0 1 1 0 21 10.5 10.5 0 0 1 0-21z"], holes: ["M11 3.6h2v16.8h-2z", "M3.6 11h16.8v2H3.6z", "M12 3.4c-3.2 2.2-4.8 5.1-4.8 8.6s1.6 6.4 4.8 8.6c-2.3-2.6-3.2-5.4-3.2-8.6s.9-6 3.2-8.6z", "M12 3.4c3.2 2.2 4.8 5.1 4.8 8.6s-1.6 6.4-4.8 8.6c2.3-2.6 3.2-5.4 3.2-8.6s-.9-6-3.2-8.6z"] },
  { id: "chip", label: "Chip", solid: ["M5 5h14v14H5z", "M7.5 1.5h1.8V5H7.5zM11.1 1.5h1.8V5h-1.8zM14.7 1.5h1.8V5h-1.8zM7.5 19h1.8v3.5H7.5zM11.1 19h1.8v3.5h-1.8zM14.7 19h1.8v3.5h-1.8zM1.5 7.5H5v1.8H1.5zM1.5 11.1H5v1.8H1.5zM1.5 14.7H5v1.8H1.5zM19 7.5h3.5v1.8H19zM19 11.1h3.5v1.8H19zM19 14.7h3.5v1.8H19z"], holes: ["M8.6 8.6h6.8v6.8H8.6z"] },
];

// Holes are cut with a mask, so they're see-through on any background.
function asciiIconSvg(icon, color = "#000") {
  const holes = icon.holes.map((d) => `<path fill="#000" d="${d}"/>`).join("");
  const solid = icon.solid.map((d) => `<path d="${d}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="240" height="240"><mask id="holes"><rect width="24" height="24" fill="#fff"/>${holes}</mask><g fill="${color}" mask="url(#holes)">${solid}</g></svg>`;
}

// A pasted icon: every shape filled solid black. Holes come from the SVG's own fill-rule.
function asciiCustomSvg(svg) {
  const { w, h } = viewBoxOf(svg);
  const scale = 240 / Math.max(w, h);
  return sanitize(svg)
    .replace(/<svg([^>]*?)\swidth=["'][^"']*["']/i, "<svg$1")
    .replace(/<svg([^>]*?)\sheight=["'][^"']*["']/i, "<svg$1")
    .replace(/<svg/i, `<svg width="${w * scale}" height="${h * scale}"`)
    .replace(/<svg([^>]*)>/i, `<svg$1><style>*{fill:#000 !important;stroke:none !important;}</style>`);
}

// How much of each cell the icon covers, 0–1, with the edges blurred. Cached per grid size.
const asciiCells = new Map();
function asciiGrid(image, cols, rows, box) {
  const key = `${cols}x${rows}|${image.src}`;
  if (asciiCells.has(key)) return asciiCells.get(key);
  const { cellW, cellH, size, sample, softness } = ASCII;
  const fit = Math.min((box.h * size) / image.height, (box.w * 0.86) / image.width);
  const drawW = image.width * fit, drawH = image.height * fit;
  const canvas = document.createElement("canvas");
  canvas.width = cols * sample;
  canvas.height = rows * sample;
  const mask = canvas.getContext("2d", { willReadFrequently: true });
  mask.filter = `blur(${softness * sample}px)`;
  // Drawn in cell units, so the grid's tall cells don't stretch the icon.
  mask.scale(sample / cellW, sample / cellH);
  mask.drawImage(image, (cols * cellW - drawW) / 2, (rows * cellH - drawH) / 2, drawW, drawH);
  const { data } = mask.getImageData(0, 0, canvas.width, canvas.height);
  const cover = new Float32Array(cols * rows);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let sum = 0;
      for (let y = 0; y < sample; y++) {
        for (let x = 0; x < sample; x++) sum += data[((row * sample + y) * canvas.width + col * sample + x) * 4 + 3];
      }
      cover[row * cols + col] = sum / (255 * sample * sample);
    }
  }
  asciiCells.set(key, cover);
  if (asciiCells.size > 12) asciiCells.delete(asciiCells.keys().next().value);
  return cover;
}

function drawAscii(ctx, s, ox, oy, time, box) {
  const image = loaded?.images.asciiMask;
  if (!image) return;
  const { cellW, cellH, font, ramp, flicker, fillGap, bg, bgOpacity, bgAmount, bgBase, bgFrom } = ASCII;
  const cols = Math.floor(box.w / cellW);
  const rows = Math.floor(box.h / cellH);
  const cover = asciiGrid(image, cols, rows, box);
  const left = box.x + (box.w - cols * cellW) / 2 + cellW / 2;
  const top = box.y + (box.h - rows * cellH) / 2 + cellH / 2;
  const a = (2 * Math.PI * time) / state.loopLength;
  const progress = time / state.loopLength;
  // Each cell's run of random rolls, changing a whole number of times per loop.
  const rollAt = (cell, salt, rate) => {
    const changes = Math.max(1, Math.round(state.loopLength * rate * (0.5 + hash(cell, salt))));
    const step = Math.floor(progress * changes + hash(cell, salt + 1) * changes) % changes;
    return [hash(cell, step + salt + 2), hash(cell, step + salt + 3)];
  };
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const icon = [];
  ctx.globalAlpha = bgOpacity;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = row * cols + col;
      const c = cover[cell];
      const x = col * cellW, y = row * cellH;
      // The icon thins out toward its blurred edge: its share of the cell is the chance of a character.
      const [roll, pick] = rollAt(cell, 11, flicker);
      // Smoothstepped, so the inside stays full and only the last cell or two at the edge thins out.
      const t = Math.min(1, Math.max(0, (c - 0.1) / 0.6));
      if (c > 0.05 && roll < t * t * (3 - 2 * t) * (1 - fillGap)) {
        icon.push(cell, c, pick);
        continue;
      }
      // Background, every other column so the glyphs sit spaced out, fading out under the icon.
      if ((col + row) % 2) continue;
      const n = (
        Math.sin(x / 110 + y / 190 + 2 * a) +
        Math.sin(x / 170 - y / 90 - a + 1.3) +
        Math.sin((x + y) / 260 + a + 2.1)
      ) / 6 + 0.5;
      const patch = Math.max(0, (n - bgFrom) / (1 - bgFrom));
      const density = (bgBase + patch * (bgAmount - bgBase)) * (1 - c);
      const [bgRoll, bgPick] = rollAt(cell, 21, flicker * 0.6);
      if (bgRoll > density) continue;
      const level = Math.floor((0.7 * patch + 0.3 * bgPick) * bg.length);
      ctx.fillText(bg[Math.min(bg.length - 1, level)], left + x, top + y);
    }
  }
  // The icon: heavier characters deeper inside, lifted by a soft diagonal wave as it passes.
  ctx.globalAlpha = 1;
  for (let i = 0; i < icon.length; i += 3) {
    const cell = icon[i], c = icon[i + 1], pick = icon[i + 2];
    const col = cell % cols, row = (cell - col) / cols;
    const wave = (Math.sin((col * cellW + row * cellH) / 70 - 3 * a) + 1) / 2;
    const level = Math.floor((0.45 * c + 0.3 * wave + 0.25 * pick) * ramp.length);
    ctx.fillText(ramp[Math.min(ramp.length - 1, level)], left + col * cellW, top + row * cellH);
  }
  ctx.beginPath();
}

const TEXTURES = {
  // padY: px kept clear above and below, so bars don't touch the frame lines.
  settle: { label: "Settle", w: SETTLE.w, h: SETTLE.h, draw: drawSettle, padY: 5 },
  warp: { label: "Warp", w: WARP.w, h: WARP.h, draw: drawWarp },
  flicker: { label: "Flicker", w: 1, h: 1, draw: drawFlicker },
  ascii: { label: "ASCII", w: 1, h: 1, draw: drawAscii },
};

function drawTexture(ctx, x, y, w, h, colors) {
  const texture = TEXTURES[state.texture];
  const s = Math.max(w / texture.w, h / texture.h);
  const pad = texture.padY ?? 0;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y + pad, w, h - pad * 2);
  ctx.clip();
  ctx.fillStyle = colors.line;
  ctx.beginPath();
  texture.draw(ctx, s, x + (w - texture.w * s) / 2, y + (h - texture.h * s) / 2, textureTime, { x, y, w, h }, colors);
  ctx.fill();
  ctx.restore();
}

// ---- Illustration motion: draws itself ----
// Lines draw out from the middle of the illustration: the ones nearest the center start first and
// the rest follow outward, many at once, each tracing itself in quickly. The drawing holds, then
// the lines retract in reverse (outside in) just before the loop ends, so videos loop seamlessly.
// Times are in seconds, so the build looks the same whatever the loop length.
const DRAW = {
  delay: 0.3,        // blank moment before the first line starts
  spread: 1.8,       // from the first line starting to the last
  stroke: 0.9,       // how long each line takes to draw
  eraseSpread: 0.9,  // the same, for the retract at the end
  eraseStroke: 0.5,
  jitter: 0.25,      // share of the spread that's random, so neighbors don't move in lockstep
  ghostAlpha: 0.35,  // the whole drawing sits underneath, faint, in the line color; the drawing traces over it in ink
};

const imageryMoves = () => state.template === "texture" || (state.template === "illustration" && state.motion === "draw");
// Only the Open Graph size has a headline, so text motion alone animates just that size.
const animated = (key = "master") => imageryMoves() || (key === "master" && state.textMotion !== "none");

// Splits each path into its subpaths (canvas restarts dashes on each one), measures them, and
// gives each an order from 0 (at the center of the drawing) to 1 (furthest out).
const measurer = document.createElementNS("http://www.w3.org/2000/svg", "path");
function strokesOf(svg) {
  const paths = [...svg.matchAll(/<path\b[^>]*\sd=["']([^"']+)["']/gi)].map((match) => match[1]);
  if (!paths.length || /<(rect|circle|ellipse|line|polyline|polygon)\b/i.test(svg)) return null;
  const strokes = [];
  paths.forEach((d, shape) => {
    // Relative moves depend on the previous subpath, so those paths stay whole.
    const parts = /m/.test(d) ? [d] : d.split(/(?=M)/).filter((part) => part.trim());
    for (const part of parts) {
      measurer.setAttribute("d", part);
      const length = measurer.getTotalLength();
      // Where the line sits: the average of a few points along it.
      let x = 0, y = 0;
      for (let i = 0; i < 5; i++) {
        const point = measurer.getPointAtLength((length * i) / 4);
        x += point.x / 5;
        y += point.y / 5;
      }
      strokes.push({ shape, path: new Path2D(part), length, x, y });
    }
  });
  const fills = paths.map((d) => new Path2D(d));
  const xs = strokes.map((s) => s.x), ys = strokes.map((s) => s.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const far = Math.max(...strokes.map((s) => Math.hypot(s.x - cx, s.y - cy))) || 1;
  strokes.forEach((stroke, i) => {
    const out = Math.hypot(stroke.x - cx, stroke.y - cy) / far;
    stroke.order = (1 - DRAW.jitter) * out + DRAW.jitter * hash(i, 7);
  });
  return { strokes, fills };
}

// How much of a line shows at this moment, 0 to 1: drawing in, then retracting at the end.
const easeOut = (x) => 1 - (1 - x) ** 3;
function shownAt(stroke, time) {
  const t = (((time % state.loopLength) + state.loopLength) % state.loopLength);
  const clamp = (x) => Math.min(1, Math.max(0, x));
  const drawn = easeOut(clamp((t - DRAW.delay - stroke.order * DRAW.spread) / DRAW.stroke));
  // Retract outside in: the furthest lines go first, and the last one is gone right at the loop's end.
  const eraseStart = state.loopLength - DRAW.eraseSpread - DRAW.eraseStroke - 0.1;
  const erased = easeOut(clamp((t - eraseStart - (1 - stroke.order) * DRAW.eraseSpread) / DRAW.eraseStroke));
  return Math.min(drawn, 1 - erased);
}

function drawIllustrationMotion(ctx, images, colors, cx, cy, box, complete = false) {
  const { viewBox, strokes } = images.illustrationShape;
  if (!strokes) return drawFitted(ctx, images.illustration, cx, cy, box);
  const scale = box / Math.max(viewBox.w, viewBox.h);
  const shown = strokes.strokes.map((stroke) => (complete ? 1 : shownAt(stroke, textureTime)));
  ctx.save();
  ctx.translate(cx - (viewBox.w * scale) / 2, cy - (viewBox.h * scale) / 2);
  ctx.scale(scale, scale);
  ctx.translate(-viewBox.x, -viewBox.y);
  ctx.lineWidth = state.stroke / scale;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.fillStyle = colors.bg;
  // Shape by shape, back to front: its fill hides the lines behind it, then its faint full lines,
  // then the part of each line drawn so far in ink on top.
  let shape = -1;
  strokes.strokes.forEach((stroke, i) => {
    if (stroke.shape !== shape) {
      shape = stroke.shape;
      ctx.fill(strokes.fills[shape]);
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = DRAW.ghostAlpha;
    ctx.strokeStyle = colors.line;
    ctx.stroke(stroke.path);
    ctx.globalAlpha = 1;
    const length = shown[i] * stroke.length;
    if (length <= 0) return;
    ctx.strokeStyle = colors.ink;
    ctx.setLineDash([length, stroke.length * 2 + 1]);
    ctx.lineDashOffset = 0;
    ctx.stroke(stroke.path);
  });
  ctx.restore();
}

// Still: the styled SVG image, as before. Draw: the animated lines. PNGs of Draw show it complete.
let exportingStill = false;
function drawIllustration(ctx, images, colors, cx, cy, box) {
  if (state.motion !== "draw") return drawFitted(ctx, images.illustration, cx, cy, box);
  drawIllustrationMotion(ctx, images, colors, cx, cy, box, exportingStill || reducedMotion.matches);
}

// ---- Headline motion ----
// Fade: lines fade and rise in one after another. Typing: typed out with a blinking caret.
// Both come in at the start of the loop, hold, and fade out just before it ends, so videos loop.
const TEXT_MOTION = {
  delay: 0.4, // s before the text starts
  fadeIn: 0.8, // s per line
  stagger: 0.18, // s between lines
  rise: 8, // px
  typeSpeed: 28, // characters per second
  blink: 1.06, // s per caret blink
  outStart: 0.88, outEnd: 0.93, // fade out, as fractions of the loop
};

function drawHeadline(ctx, lines, baselineOf) {
  const still = state.textMotion === "none" || exportingStill || reducedMotion.matches;
  if (still) {
    lines.forEach((text, i) => ctx.fillText(text, GRID.textX, baselineOf(i)));
    return;
  }
  const m = TEXT_MOTION;
  const t = textureTime;
  const progress = t / state.loopLength;
  const out = 1 - Math.min(1, Math.max(0, (progress - m.outStart) / (m.outEnd - m.outStart)));
  if (out <= 0) return;
  const ease = (x) => 1 - (1 - x) ** 3;
  ctx.save();
  if (state.textMotion === "fade") {
    lines.forEach((text, i) => {
      const k = ease(Math.min(1, Math.max(0, (t - m.delay - i * m.stagger) / m.fadeIn)));
      ctx.globalAlpha = k * out;
      ctx.fillText(text, GRID.textX, baselineOf(i) + (1 - k) * m.rise);
    });
  } else {
    let left = Math.max(0, Math.floor((t - m.delay) * m.typeSpeed));
    const total = lines.reduce((sum, text) => sum + text.length, 0);
    const typing = left < total;
    let caret = null;
    ctx.globalAlpha = out;
    lines.forEach((text, i) => {
      if (left <= 0 && caret) return;
      const shown = text.slice(0, Math.max(0, left));
      left -= text.length;
      if (shown) ctx.fillText(shown, GRID.textX, baselineOf(i));
      if (left <= 0 && !caret) caret = { x: GRID.textX + (shown ? ctx.measureText(shown).width : 0), y: baselineOf(i) };
    });
    if (!caret && lines.length) {
      const last = lines.length - 1;
      caret = { x: GRID.textX + ctx.measureText(lines[last]).width, y: baselineOf(last) };
    }
    // The caret stays solid while typing, then blinks.
    if (caret && t >= m.delay && (typing || (t - m.delay) % m.blink < m.blink / 2)) {
      ctx.fillRect(Math.round(caret.x + 3), Math.round(caret.y - 38), 3, 46);
    }
  }
  ctx.restore();
}

// ---- Templates ----

function drawMaster(ctx, images, colors) {
  const g = GRID;
  const story = state.template === "customer";
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, 1200, 675);

  // The texture fills the panel on its own, so it goes without the hatched strips.
  if (state.template !== "texture") {
    drawHatch(ctx, g.splitX + 1, g.top + 1, g.right - g.splitX - 1, g.headerY - g.top - 1, colors);
    drawHatch(ctx, g.splitX + 1, g.footerY + 1, g.right - g.splitX - 1, g.bottom - g.footerY - 1, colors);
  }

  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 1;
  ctx.strokeRect(crisp(g.left), crisp(g.top), g.right - g.left, g.bottom - g.top);
  line(ctx, g.left, g.headerY, g.right, g.headerY);
  line(ctx, g.left, g.footerY, g.right, g.footerY);
  line(ctx, g.splitX, g.top, g.splitX, g.bottom);

  if (story) {
    line(ctx, g.splitX, g.storyMidY, g.right, g.storyMidY);
    drawCentered(ctx, images.logo, g.storyCenterX + 1, g.storyLogoY, BRANDS[state.brand].storyWidth);
    drawCentered(ctx, images.customer, g.storyCenterX, g.storyCustomerY, state.customerWidth);
  } else if (state.template === "texture") {
    drawTexture(ctx, g.splitX + 1, g.headerY + 1, g.right - g.splitX - 1, g.footerY - g.headerY - 1, colors);
  } else {
    drawIllustration(ctx, images, colors, g.illustrationX, g.illustrationY, g.illustrationSize);
  }

  for (const [x, y] of [
    [g.left, g.top], [g.right, g.top], [g.left, g.bottom], [g.right, g.bottom],
    [g.splitX, g.headerY], [g.splitX, g.footerY],
  ]) handle(ctx, x, y, g.handle, colors);

  const { x, y, w } = BRANDS[state.brand].header;
  ctx.drawImage(images.logo, x, y, w, w * (images.logo.naturalHeight / images.logo.naturalWidth));

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = story ? colors.story : colors.ink;
  ctx.font = FONT.headline;
  ctx.letterSpacing = FONT.headlineTracking;
  const lines = wrapLines(ctx, state.headline, g.textWidth).slice(0, g.maxLines);
  drawHeadline(ctx, lines, (i) => g.textCenterY + (i - (lines.length - 1) / 2) * g.lineHeight);
  ctx.letterSpacing = "0px";

  // Customer stories space the footer a little wider.
  const dividerPad = story ? 30 : 24;
  const labelGap = story ? 24 : 28;
  ctx.fillStyle = colors.tag;
  ctx.font = FONT.tag;
  const category = state.category.toUpperCase();
  ctx.fillText(category, g.tagX, g.tagBaseline);
  const dividerX = Math.round(g.tagX + ctx.measureText(category).width + dividerPad);
  line(ctx, dividerX, g.footerY, dividerX, g.bottom);
  ctx.fillStyle = colors.tagMuted;
  ctx.font = FONT.tagMuted;
  ctx.fillText(state.label.toUpperCase(), dividerX + labelGap, g.tagBaseline);
}

// Featured and square sizes: imagery only, in the same frame language.
function drawImageOnly(ctx, images, colors, w, h) {
  const m = 20;
  const right = w - m - 1;
  const bottom = h - m - 1;
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, w, h);
  const centerX = Math.floor(w / 2) + 0.5;
  const fit = state.template === "illustration"
    ? fitToField(images, centerX, h / 2, ((bottom - m) / 2) * (GRID.illustrationSize / 250))
    : null;
  if (fit) drawField(ctx, m + 1, m + 1, right - m - 1, bottom - m - 1, fit.anchorX, fit.anchorY, colors);
  if (state.template === "texture") drawTexture(ctx, m + 1, m + 1, right - m - 1, bottom - m - 1, colors);
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 1;
  ctx.strokeRect(crisp(m), crisp(m), right - m, bottom - m);

  if (state.template === "customer") {
    const stacked = w === h;
    const mid = Math.round((stacked ? h : w) / 2);
    if (stacked) line(ctx, m, mid, right, mid);
    else line(ctx, mid, m, mid, bottom);
    const a = stacked ? [w / 2, (m + mid) / 2] : [(m + mid) / 2, h / 2];
    const b = stacked ? [w / 2, (mid + bottom) / 2] : [(mid + right) / 2, h / 2];
    drawCentered(ctx, images.logo, a[0], a[1], BRANDS[state.brand].storyWidth);
    drawCentered(ctx, images.customer, b[0], b[1], state.customerWidth);
  } else if (fit) {
    drawIllustration(ctx, images, colors, centerX, h / 2, fit.size);
  }

  for (const [x, y] of [[m, m], [right, m], [m, bottom], [right, bottom]]) {
    handle(ctx, x, y, GRID.handle, colors);
  }
}

function draw(ctx, sizeKey, images, colors) {
  if (sizeKey === "master") return drawMaster(ctx, images, colors);
  const { w, h } = SIZES[sizeKey];
  drawImageOnly(ctx, images, colors, w, h);
}

// ---- Assets ----

const sanitize = (svg) => svg
  .replace(/<script[\s\S]*?<\/script>/gi, "")
  .replace(/ on\w+="[^"]*"/gi, "")
  .replace(/ on\w+='[^']*'/gi, "");

function loadSvg(svg) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  });
}

function viewBoxOf(svg) {
  const match = svg.match(/viewBox=["']([\d.\s,-]+)["']/i);
  const [x = 0, y = 0, w = 100, h = 100] = match ? match[1].trim().split(/[\s,]+/).map(Number) : [];
  return { x, y, w, h };
}

// Straight path edges on each field axis, in viewBox units. Curves just move the pen.
function fieldEdges(svg) {
  const { rise, fall } = FIELD;
  const edges = { rising: [], falling: [] };
  const add = (x0, y0, x1, y1) => {
    const length = Math.hypot(x1 - x0, y1 - y0);
    if (length < 2 || x0 === x1) return;
    const slope = (y1 - y0) / (x1 - x0);
    if (Math.abs(slope + rise) < 0.03) edges.rising.push({ x: x0, y: y0, length });
    else if (Math.abs(slope - fall) < 0.03) edges.falling.push({ x: x0, y: y0, length });
  };
  const argCount = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7 };

  for (const [, d] of svg.matchAll(/\sd=["']([^"']+)["']/g)) {
    const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/gi) || [];
    let x = 0, y = 0, startX = 0, startY = 0, command = "M", i = 0;
    while (i < tokens.length) {
      if (/[a-zA-Z]/.test(tokens[i])) command = tokens[i++];
      const type = command.toUpperCase();
      const relative = command !== type;
      if (type === "Z") {
        add(x, y, startX, startY);
        x = startX;
        y = startY;
        continue;
      }
      const args = tokens.slice(i, i + argCount[type]).map(Number);
      i += argCount[type];
      if (!argCount[type] || args.some(Number.isNaN)) break;
      const endX = type === "V" ? x : (relative ? x : 0) + args[type === "H" ? 0 : args.length - 2];
      const endY = type === "H" ? y : (relative ? y : 0) + args[args.length - 1];
      if (type === "L" || type === "H" || type === "V") add(x, y, endX, endY);
      x = endX;
      y = endY;
      if (type === "M") {
        startX = x;
        startY = y;
        command = relative ? "l" : "L";
      }
    }
  }
  return edges;
}

// Size the SVG up front so the stroke keeps a true pixel width on the canvas.
function styledIllustration(svg, colors) {
  const { w: vbW, h: vbH } = viewBoxOf(svg);
  const scale = GRID.illustrationSize / Math.max(vbW, vbH);
  const width = vbW * scale;
  const height = vbH * scale;
  return sanitize(svg)
    .replace(/<svg([^>]*?)\swidth=["'][^"']*["']/i, "<svg$1")
    .replace(/<svg([^>]*?)\sheight=["'][^"']*["']/i, "<svg$1")
    .replace(/<svg/i, `<svg width="${width}" height="${height}"`)
    .replace(/<svg([^>]*)>/i, `<svg$1><style>*{fill:${colors.bg} !important;stroke:${colors.line} !important;stroke-width:${state.stroke / scale} !important;}</style>`);
}

function customerSvg(source, colors) {
  const svg = sanitize(source);
  return svg.replace(/<svg([^>]*)>/i, `<svg$1><style>*{fill:${colors.story} !important;stroke:none !important;}</style>`);
}

async function loadImages(colors) {
  const preset = ILLUSTRATIONS.find((item) => item.id === state.illustration);
  const source = state.customIllustration.trim() || preset.svg;
  const usedSource = { svg: source };
  const [logo, illustration, customer] = await Promise.all([
    loadSvg(BRANDS[state.brand].logo(colors)),
    loadSvg(styledIllustration(source, colors)).catch(() => {
      usedSource.svg = preset.svg;
      return loadSvg(styledIllustration(preset.svg, colors));
    }),
    loadSvg(customerSvg(state.customerLogo.trim() || LOGOS.exampleCustomer, colors))
      .catch(() => loadSvg(customerSvg(LOGOS.exampleCustomer, colors))),
  ]);
  const asciiMask = state.template === "texture" && state.texture === "ascii"
    ? await loadSvg(state.asciiSvg.trim() ? asciiCustomSvg(state.asciiSvg) : asciiIconSvg(ASCII_ICONS.find((icon) => icon.id === state.asciiIcon)))
      .catch(() => loadSvg(asciiIconSvg(ASCII_ICONS.find((icon) => icon.id === state.asciiIcon))))
    : null;
  const illustrationShape = {
    edges: fieldEdges(usedSource.svg),
    viewBox: viewBoxOf(usedSource.svg),
    strokes: strokesOf(sanitize(usedSource.svg)),
  };
  return { logo, illustration, illustrationShape, customer, asciiMask };
}

// ---- Rendering and export ----

const stage = document.getElementById("stage");
const canvases = {};

const summary = document.createElement("div");
summary.className = "canvas summary";
const summaryBar = document.createElement("div");
summaryBar.className = "cbar";
const summaryKeys = ["brand", "template", "theme"].map((name) => {
  const key = document.createElement("span");
  key.className = "k";
  key.dataset.key = name;
  summaryBar.append(key);
  return key;
});
const exportAll = document.createElement("button");
exportAll.className = "export-all btn push";
exportAll.type = "button";
exportAll.textContent = "Download all 3 sizes";
exportAll.addEventListener("click", async () => {
  for (const key of Object.keys(SIZES)) {
    await exportSize(key);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
});
summaryBar.append(exportAll);
summary.append(summaryBar);
stage.append(summary);

// Video export: the best format this browser can record. Chrome and Safari record MP4; others WebM.
const VIDEO = (() => {
  const types = ["video/mp4;codecs=avc1.640028", "video/mp4", "video/webm;codecs=vp9", "video/webm"];
  const type = window.MediaRecorder ? types.find((t) => MediaRecorder.isTypeSupported(t)) : null;
  return { type, label: type?.startsWith("video/mp4") ? "MP4" : "WebM", ext: type?.startsWith("video/mp4") ? "mp4" : "webm" };
})();

for (const [key, size] of Object.entries(SIZES)) {
  const card = document.createElement("div");
  card.className = `canvas preview ${key}`;
  const bar = document.createElement("div");
  bar.className = "cbar";
  const dims = document.createElement("span");
  dims.className = "k";
  dims.append(`${size.name} `);
  const value = document.createElement("b");
  value.textContent = `${size.w} × ${size.h}`;
  dims.append(value);
  const button = document.createElement("button");
  button.className = "export btn ghost push";
  button.type = "button";
  button.textContent = "PNG";
  button.setAttribute("aria-label", `Download ${size.name} PNG`);
  button.addEventListener("click", () => exportSize(key));
  const video = document.createElement("button");
  video.className = "export btn ghost push";
  video.type = "button";
  video.dataset.video = key;
  video.textContent = VIDEO.label;
  video.setAttribute("aria-label", `Download ${size.name} ${VIDEO.label}, one full loop`);
  video.addEventListener("click", () => exportVideo(key));
  const buttons = document.createElement("span");
  buttons.className = "cbar-buttons";
  buttons.append(video, button);
  bar.append(dims, buttons);
  const view = document.createElement("div");
  view.className = "view";
  const canvas = document.createElement("canvas");
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", `${size.name} preview`);
  view.append(canvas);
  card.append(bar, view);
  stage.append(card);
  canvases[key] = canvas;
}

let renderId = 0;
let loaded = null;
async function render() {
  const id = ++renderId;
  const colors = THEMES[state.brand][state.theme];
  const images = await loadImages(colors);
  if (id !== renderId) return;
  loaded = { images, colors };
  paintPreviews();
  animate();
}

function paintPreviews() {
  for (const [key, size] of Object.entries(SIZES)) {
    const canvas = canvases[key];
    // Previews match their on-screen pixels: shrinking a 2x canvas breaks up the thin lines.
    const ratio = ((canvas.clientWidth || size.w) * window.devicePixelRatio) / size.w;
    paint(canvas, key, Math.min(ratio, 2), loaded.images, loaded.colors);
  }
}

// Textures and drawing illustrations play on their own. Reduced motion holds a still frame.
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let frame = 0;
let lastFrameAt = 0;
function animate() {
  if (frame || !animated() || reducedMotion.matches) return;
  lastFrameAt = 0;
  const tick = (now) => {
    if (!animated() || reducedMotion.matches) {
      frame = 0;
      return;
    }
    // While a video records, it drives the clock and paints the previews itself.
    if (!recording) {
      textureTime = (textureTime + (lastFrameAt ? (now - lastFrameAt) / 1000 : 0)) % state.loopLength;
      paintPreviews();
    }
    lastFrameAt = now;
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
}
reducedMotion.addEventListener("change", animate);

function paint(canvas, key, ratio, images, colors) {
  const size = SIZES[key];
  const width = Math.round(size.w * ratio);
  const height = Math.round(size.h * ratio);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(canvas.width / size.w, 0, 0, canvas.height / size.h, 0, 0);
  draw(ctx, key, images, colors);
}

async function exportSize(key) {
  const colors = THEMES[state.brand][state.theme];
  const canvas = document.createElement("canvas");
  const images = await loadImages(colors);
  exportingStill = true;
  paint(canvas, key, 2, images, colors);
  exportingStill = false;
  const link = document.createElement("a");
  const brand = BRANDS[state.brand].file;
  link.download = `${brand}-${state.template}-${state.theme}-${key}-${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// Records one full loop in real time, so a 30s loop takes 30s. The video repeats seamlessly.
let recording = null;
async function exportVideo(key) {
  if (recording || !VIDEO.type) return;
  const colors = THEMES[state.brand][state.theme];
  const images = await loadImages(colors);
  const canvas = document.createElement("canvas");
  const length = state.loopLength;
  const startAt = textureTime;
  paint(canvas, key, 1, images, colors);
  const recorder = new MediaRecorder(canvas.captureStream(60), { mimeType: VIDEO.type, videoBitsPerSecond: 8_000_000 });
  const chunks = [];
  recorder.ondataavailable = (event) => event.data.size && chunks.push(event.data);
  const done = new Promise((resolve) => { recorder.onstop = resolve; });
  recording = { key };
  syncControls();
  recorder.start();
  const begin = performance.now();
  await new Promise((resolve) => {
    const step = (now) => {
      const elapsed = (now - begin) / 1000;
      textureTime = (startAt + Math.min(elapsed, length)) % length;
      paint(canvas, key, 1, images, colors);
      paintPreviews();
      recording.left = Math.ceil(length - elapsed);
      syncVideoButtons();
      if (elapsed >= length) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  recorder.stop();
  await done;
  recording = null;
  syncControls();
  const link = document.createElement("a");
  const brand = BRANDS[state.brand].file;
  const subject = state.template === "texture" ? state.texture : state.customIllustration.trim() ? "custom" : state.illustration;
  link.download = `${brand}-${subject}-${state.theme}-${key}-${Date.now()}.${VIDEO.ext}`;
  link.href = URL.createObjectURL(new Blob(chunks, { type: VIDEO.type }));
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
}

function syncVideoButtons() {
  for (const button of document.querySelectorAll("[data-video]")) {
    button.hidden = !animated(button.dataset.video) || !VIDEO.type;
    button.disabled = Boolean(recording);
    button.textContent = recording?.key === button.dataset.video ? `Recording… ${recording.left ?? state.loopLength}s` : VIDEO.label;
  }
}

// ---- Controls ----

const form = document.getElementById("controls");

function syncControls() {
  for (const group of document.querySelectorAll("[data-group]")) {
    for (const button of group.querySelectorAll("button")) {
      button.setAttribute("aria-pressed", String(state[group.dataset.group] === button.dataset.value));
    }
  }
  for (const field of form.querySelectorAll("[name]")) {
    if (field.value !== String(state[field.name])) field.value = state[field.name];
  }
  for (const section of form.querySelectorAll("[data-show]")) {
    section.hidden = section.dataset.show !== state.template;
  }
  syncVideoButtons();
  for (const option of form.querySelectorAll("[data-motion]")) {
    option.hidden = option.dataset.motion !== state.motion;
  }
  for (const option of form.querySelectorAll("[data-texture]")) {
    option.hidden = option.dataset.texture !== state.texture;
  }
  for (const button of document.querySelectorAll("#asciiIcons button")) {
    button.setAttribute("aria-pressed", String(button.dataset.id === state.asciiIcon && !state.asciiSvg.trim()));
  }
  for (const button of document.querySelectorAll("#illustrations button")) {
    button.setAttribute("aria-pressed", String(button.dataset.id === state.illustration));
  }
  for (const key of summaryKeys) {
    key.replaceChildren(`${key.dataset.key} `, Object.assign(document.createElement("b"), { textContent: state[key.dataset.key] }));
  }
  document.getElementById("strokeValue").textContent = `${state.stroke}px`;
  document.getElementById("fieldSpacingValue").textContent = `${state.fieldSpacing}px`;
  document.getElementById("customerWidthValue").textContent = `${state.customerWidth}px`;
  for (const output of document.querySelectorAll(".loop-length-value")) output.textContent = `${state.loopLength}s`;
  document.getElementById("densityValue").textContent = `${state.density}×`;
}

// The drawing and the headline only move at the start of the loop, so these replay it from there.
const REPLAYS = ["template", "motion", "illustration", "customIllustration", "textMotion"];

function update(changes) {
  if (!recording && REPLAYS.some((key) => key in changes && changes[key] !== state[key])) textureTime = 0;
  Object.assign(state, changes);
  syncControls();
  render();
}

function selectTemplate(template) {
  const previous = DEFAULTS[state.template];
  const next = DEFAULTS[template];
  update({
    template,
    headline: state.headline === previous.headline ? next.headline : state.headline,
    category: state.category === previous.category ? next.category : state.category,
  });
}

for (const group of document.querySelectorAll("[data-group]")) {
  group.addEventListener("click", (event) => {
    const value = event.target.dataset.value;
    if (!value) return;
    if (group.dataset.group === "template") selectTemplate(value);
    else update({ [group.dataset.group]: value });
  });
}

form.addEventListener("input", (event) => {
  const { name, value, type } = event.target;
  if (name) update({ [name]: type === "range" ? Number(value) : value });
});
form.addEventListener("submit", (event) => event.preventDefault());

const picker = document.getElementById("illustrations");
for (const item of ILLUSTRATIONS) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.id = item.id;
  button.title = item.label;
  button.setAttribute("aria-label", item.label);
  const image = document.createElement("img");
  image.alt = "";
  image.src = `data:image/svg+xml;utf8,${encodeURIComponent(
    item.svg.replace(/<svg([^>]*)>/i, "<svg$1><style>*{fill:none !important;stroke:#8B8D98 !important;}</style>"),
  )}`;
  button.append(image);
  button.addEventListener("click", () => update({ illustration: item.id, customIllustration: "" }));
  picker.append(button);
}

const iconPicker = document.getElementById("asciiIcons");
for (const icon of ASCII_ICONS) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.id = icon.id;
  button.title = icon.label;
  button.setAttribute("aria-label", icon.label);
  const image = document.createElement("img");
  image.alt = "";
  image.src = `data:image/svg+xml;utf8,${encodeURIComponent(asciiIconSvg(icon, "#8B8D98"))}`;
  button.append(image);
  button.addEventListener("click", () => update({ asciiIcon: icon.id, asciiSvg: "" }));
  iconPicker.append(button);
}

window.addEventListener("resize", render);

document.documentElement.dataset.theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

syncControls();
Promise.all([
  document.fonts.load(FONT.headline),
  document.fonts.load(FONT.tag),
  document.fonts.load(FONT.tagMuted),
]).finally(render);
