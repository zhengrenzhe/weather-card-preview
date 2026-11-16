// ---------- 颜色（OKLab 插值）----------
function hexToRgb(h) { h = h.replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); }
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function rgbToLab(rgb) {
  const [r, g, b] = rgb.map(toLin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function labToRgb([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map((c) => clamp(toSrgb(c)));
}
const lab = (hex) => rgbToLab(hexToRgb(hex));
const mixLab = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const cssOf = (c) => { const [r, g, b] = labToRgb(c).map((x) => Math.round(x * 255)); return `rgb(${r} ${g} ${b})`; };

const CLEAR_SKY = [
  [-1, "#03060f", "#070d22", "#0f1a3c"],
  [-0.35, "#070d27", "#16204e", "#2d3468"],
  [-0.12, "#121f55", "#3f3a7a", "#8e5d86"],
  [0, "#22377e", "#7e6299", "#ef9668"],
  [0.1, "#2f5fb2", "#a88aa6", "#f5bb7c"],
  [0.3, "#1f5dc4", "#3a7bd6", "#6c9fe2"],
  [1, "#164fbe", "#2a6dd2", "#5a91dd"],
];
const GRAY_SKY = [
  [-1, "#08090d", "#0e1218", "#151a22"],
  [-0.35, "#10141c", "#191e28", "#232934"],
  [-0.12, "#1d2230", "#2c3240", "#424450"],
  [0, "#30384a", "#4a505f", "#66646d"],
  [0.1, "#454e60", "#5e6677", "#7d818c"],
  [0.3, "#505c70", "#677488", "#8290a3"],
  [1, "#536177", "#6b798e", "#8794a7"],
];
function sampleSky(keys, e) {
  let i = 0;
  while (i < keys.length - 2 && e > keys[i + 1][0]) i++;
  const [e0, ...c0] = keys[i], [e1, ...c1] = keys[i + 1];
  const t = clamp((e - e0) / (e1 - e0));
  return c0.map((hex, k) => mixLab(lab(hex), lab(c1[k]), t));
}
function elevation(h) {
  if (h >= SUNRISE && h <= SUNSET) return Math.sin((Math.PI * (h - SUNRISE)) / (SUNSET - SUNRISE));
  const d = h < SUNRISE ? SUNRISE - h : h - SUNSET;
  return -Math.min(1, d / 2.2);
}
/** 时间与天气 → 着色器参数 */
function scene(condId, hour) {
  const c = condById(condId);
  const e = elevation(hour);
  const clear = sampleSky(CLEAR_SKY, e), gray = sampleSky(GRAY_SKY, e);
  const g = c.gray ?? c.cover * 0.5;
  const dk = 1 - 0.22 * (c.dark ?? 0);
  const sky = clear.map((col, k) => { const m = mixLab(col, gray[k], g); return [m[0] * dk, m[1] * dk, m[2] * dk]; });
  const day = clamp((e + 0.12) / 0.42);
  const golden = clamp(1 - Math.abs(e - 0.04) / 0.14);
  // 云：受光面与背光面
  let light = mixLab(lab("#4a5570"), lab("#ffffff"), day);
  light = mixLab(light, lab("#ffd0b0"), golden * 0.75);
  let shade = mixLab(lab("#161c2b"), lab("#b4c0d2"), day);
  shade = mixLab(shade, lab("#7a5a78"), golden * 0.5);
  const dark = c.dark ?? 0;
  light = mixLab(light, mixLab(lab("#2a303d"), lab("#a3abb8"), day), clamp(dark * 1.1));
  shade = mixLab(shade, mixLab(lab("#0b0e15"), lab("#4a5262"), day), clamp(dark * 1.1));
  const p = clamp((hour - SUNRISE) / (SUNSET - SUNRISE));
  return {
    c, e, day, golden, sky, light, shade,
    sun: [0.16 + 0.68 * p, 0.92 - 0.8 * Math.max(e, -0.12)],
    sunVis: clamp((e + 0.06) / 0.1) * c.sun,
    sunCore: mixLab(lab("#fffaf0"), lab("#ffd8a8"), golden),
    glow: mixLab(lab("#fff1c8"), lab("#ff9a50"), golden),
    moon: [0.7, 0.17],
    moonVis: clamp((-e - 0.05) / 0.25) * clamp(1 - 1.2 * c.cover),
    stars: clamp((-e - 0.1) / 0.3),
    fogCol: mixLab(sky[1], lab("#ffffff"), 0.2 + 0.25 * day),
  };
}

// ---------- 彩色图标与内容（同上一版）----------
const YELLOW = "#ffcf33", DROP = "#5cb8ff", MOON = "#f1ead6";
const fmt = (n) => Math.round(n * 1000) / 1000;
function cloudShape(fill, shade, t = "") {
  const s = `<circle cx='7.6' cy='13.7' r='3.6'/><circle cx='12.3' cy='10.6' r='4.9'/><circle cx='16.9' cy='13.4' r='3.7'/><rect x='7.6' y='12.6' width='9.3' height='4.8' rx='1.2'/>`;
  return `<g transform='${t}'><g fill='${shade}' transform='translate(0 1)'>${s}</g><g fill='${fill}'>${s}</g></g>`;
}
const sunShape = (cx, cy, r) => { let s = `<circle cx='${cx}' cy='${cy}' r='${r}' fill='${YELLOW}'/>`; for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, r1 = r + 1.9, r2 = r + 3.9; s += `<line x1='${fmt(cx + Math.cos(a) * r1)}' y1='${fmt(cy + Math.sin(a) * r1)}' x2='${fmt(cx + Math.cos(a) * r2)}' y2='${fmt(cy + Math.sin(a) * r2)}' stroke='${YELLOW}' stroke-width='1.7' stroke-linecap='round'/>`; } return s; };
const moonShape = (t = "") => `<path transform='${t}' d='M14.2 3.6a7.4 7.4 0 0 0 6.2 11.6A8.8 8.8 0 1 1 14.2 3.6z' fill='${MOON}'/>`;
const drops = (n) => [8.4, 12.4, 16.4, 10.4, 14.4].slice(0, n).map((x, i) => `<line x1='${x}' y1='${i < 3 ? 19.4 : 21.6}' x2='${x - 0.9}' y2='${i < 3 ? 21.4 : 23.4}' stroke='${DROP}' stroke-width='1.7' stroke-linecap='round'/>`).join("");
function icon(kind, night) {
  const W = "#ffffff", S = "#c9d4e2";
  let body;
  switch (kind) {
    case "clear": body = night ? moonShape("translate(-1.5 0.5)") : sunShape(12, 12, 4.6); break;
    case "partly": body = (night ? moonShape("translate(2 -3) scale(.82)") : sunShape(15.6, 8.2, 3.4)) + cloudShape(W, S, "translate(-2.2 2.6) scale(.92)"); break;
    case "cloudy": case "overcast": body = cloudShape(kind === "overcast" ? "#e3e8ef" : W, kind === "overcast" ? "#a9b4c3" : S, "translate(0 1)"); break;
    case "fog": body = cloudShape(W, S, "translate(0 -1)") + `<path d='M5 19.6h13.6M7.4 22.4h11.4' stroke='#d7dde6' stroke-width='1.7' stroke-linecap='round'/>`; break;
    case "drizzle": body = cloudShape(W, S, "translate(0 -2)") + drops(2); break;
    case "rain": body = cloudShape(W, S, "translate(0 -2)") + drops(5); break;
    case "storm": body = cloudShape(W, S, "translate(0 -2.5)") + `<path d='M12.9 14.6l-3 4.6h2.7l-1.5 4.2 4.6-5.6h-2.8l1.6-3.2z' fill='${YELLOW}'/>`; break;
    case "snow": body = cloudShape(W, S, "translate(0 -2)") + [8.4, 12.4, 16.4].map((x, i) => { const y = i === 1 ? 21.8 : 20.6; return `<g stroke='#fff' stroke-width='1.2' stroke-linecap='round'><line x1='${x - 1.5}' y1='${y}' x2='${x + 1.5}' y2='${y}'/><line x1='${x - 0.75}' y1='${y - 1.3}' x2='${x + 0.75}' y2='${y + 1.3}'/><line x1='${x + 0.75}' y1='${y - 1.3}' x2='${x - 0.75}' y2='${y + 1.3}'/></g>`; }).join(""); break;
  }
  return `<svg viewBox='0 0 24 24' aria-hidden='true'>${body}</svg>`;
}
const ARROW = `<svg viewBox='0 0 12 12' aria-hidden='true'><path d='M10.6 1.4L1.4 5.3l4 1.3 1.3 4z' fill='#fff'/></svg>`;
const BASE_TEMP = { clear: 19, partly: 18, cloudy: 16, overcast: 14, fog: 9, drizzle: 13, rain: 12, storm: 22, snow: -2 };
const NEXT = { clear: ["partly", "cloudy", "drizzle", "clear", "partly"], snow: ["snow", "cloudy", "clear", "partly", "snow"] };
function sampleData(condId, hour) {
  const t0 = BASE_TEMP[condId];
  const isNight = (h) => { const x = ((h % 24) + 24) % 24; return x < SUNRISE || x > SUNSET; };
  const hours = [];
  for (let i = 0; i < 8; i++) { const h = Math.floor(hour) + i; hours.push({ label: i === 0 ? "现在" : `${h % 24}时`, kind: condId, night: isNight(h + 0.5), temp: i === 0 ? t0 : Math.round(t0 + 3 * Math.sin(((h - 9) / 24) * 2 * Math.PI)) }); }
  const next = NEXT[condId] || NEXT.clear;
  const days = ["今天", "周一", "周二", "周三", "周四"].map((d, i) => { const kind = i === 0 ? condId : next[i - 1]; const base = i === 0 ? t0 : BASE_TEMP[kind] + ((i * 7) % 5) - 2; return { label: d, kind, lo: base - 7 + (i % 2), hi: base + 3 + (i % 3) }; });
  return { city: "北京", temp: t0, hi: days[0].hi, lo: days[0].lo, hours, days, night: isNight(hour) };
}
function tempColor(t) {
  const stops = [[-12, "#5a7cf0"], [0, "#4fc3ea"], [10, "#6fd48c"], [18, "#f2d04a"], [26, "#f59b3a"], [34, "#ee5848"]];
  let i = 0; while (i < stops.length - 2 && t > stops[i + 1][0]) i++;
  return cssOf(mixLab(lab(stops[i][1]), lab(stops[i + 1][1]), clamp((t - stops[i][0]) / (stops[i + 1][0] - stops[i][0]))));
}
function contentHTML(size, d, condLabel, condId) {
  const head = `<div class="city">${d.city}${ARROW}</div><div class="temp">${d.temp}°</div>`;
  const condLine = `<div class="cond">${icon(condId, d.night)}${condLabel}</div><div class="hilo">最高 ${d.hi}° 最低 ${d.lo}°</div>`;
  const hourCell = (h) => `<div class="hour"><span class="t">${h.label}</span>${icon(h.kind, h.night)}<span>${h.temp}°</span></div>`;
  if (size === "s") return `<div>${head}</div><div style="margin-top:auto">${condLine}</div>`;
  if (size === "m") return `<div style="display:flex;height:100%;gap:14px"><div style="display:flex;flex-direction:column;width:150px">${head}<div style="margin-top:auto">${condLine}</div></div><div class="row" style="flex:1;align-items:flex-end;padding-bottom:2px">${d.hours.slice(0, 6).map(hourCell).join("")}</div></div>`;
  const lo = Math.min(...d.days.map((x) => x.lo)), hi = Math.max(...d.days.map((x) => x.hi));
  const dayRow = (x, i) => { const left = ((x.lo - lo) / (hi - lo)) * 100, width = ((x.hi - x.lo) / (hi - lo)) * 100; const dot = i === 0 ? `<i class="now-dot" style="left:calc(${((d.temp - lo) / (hi - lo)) * 100}% - 3.5px)"></i>` : ""; return `<div class="day"><span>${x.label}</span><span style="display:flex;justify-content:center">${icon(x.kind, false)}</span><span class="lo">${x.lo}°</span><span class="track"><span class="fill" style="left:${left}%;width:${width}%;background:linear-gradient(90deg,${tempColor(x.lo)},${tempColor(x.hi)})"></span>${dot}</span><span class="hi">${x.hi}°</span></div>`; };
  return `<div style="display:flex;justify-content:space-between;align-items:flex-start"><div>${head}</div><div style="text-align:right;margin-top:24px">${condLine.replace('class="cond"', 'class="cond" style="justify-content:flex-end"')}</div></div><div class="sep"></div><div class="row">${d.hours.slice(0, 7).map(hourCell).join("")}</div><div class="sep"></div><div>${d.days.map(dayRow).join("")}</div>`;
}

