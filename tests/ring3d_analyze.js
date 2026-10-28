(sel) => {
  const root = document.querySelector(`[data-testid="${sel}"]`);
  if (!root) return { error: "no viewer" };
  const cv = root.querySelector("canvas");
  if (!cv) return { error: "no canvas" };
  const W = cv.width, H = cv.height;
  const c2 = document.createElement("canvas");
  c2.width = W; c2.height = H;
  const ctx = c2.getContext("2d");
  ctx.drawImage(cv, 0, 0);
  const d = ctx.getImageData(0, 0, W, H).data;
  const bg = [d[0], d[1], d[2]];
  let fg = 0, gold = 0, dark = 0, brown = 0, green = 0, white = 0, pink = 0, grey = 0;
  let sr = 0, sg = 0, sb = 0, mc = 0;
  for (let i = 0; i < d.length; i += 16) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (Math.abs(r - bg[0]) + Math.abs(g - bg[1]) + Math.abs(b - bg[2]) < 18) continue;
    fg++;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (g > r + 15 && g > b) { green++; continue; }
    if (lum < 70) dark++;
    if (r > 180 && g > 130 && r - b > 45) gold++;
    else if (lum < 140 && r - b > 25) brown++;
    if (r > 200 && g > 200 && b > 200 && Math.abs(r - b) < 25) white++;
    if (r > 170 && r - g > 25 && b > g - 5) pink++;
    if (lum >= 70 && lum < 170 && Math.abs(r - b) < 20) grey++;
    sr += r; sg += g; sb += b; mc++;
  }
  const pct = (x) => (fg ? Math.round((x / fg) * 1000) / 10 : 0);
  return {
    size: [W, H], bg, fgPct: Math.round((fg / (d.length / 16)) * 1000) / 10,
    avgMetal: mc ? [Math.round(sr / mc), Math.round(sg / mc), Math.round(sb / mc)] : null,
    goldPct: pct(gold), darkPct: pct(dark), brownPct: pct(brown), greenPct: pct(green),
    whitePct: pct(white), pinkPct: pct(pink), greyPct: pct(grey),
  };
}
